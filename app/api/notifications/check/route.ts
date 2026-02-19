import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { getGoogleCalendarEvents } from '@/app/actions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {

    if (process.env.ENABLE_NOTIFICATIONS !== 'true') {
        return NextResponse.json({ error: 'Notifications are disabled' }, { status: 403 });
    }

    // Basic security check to prevent public triggering
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000);

        // Get all subscriptions
        const subscriptions = await db.pushSubscription.findMany();

        if (subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found' });
        }

        const notificationsSent: string[] = [];

        // 1. Get Tasks starting soon
        const tasks = await db.task.findMany({
            where: {
                scheduledDate: todayStr,
                scheduledStartTime: { not: null },
            },
        });

        const tasksToNotify = tasks.filter(task => {
            if (!task.scheduledStartTime) return false;
            const [h, m] = task.scheduledStartTime.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(h, m, 0, 0);

            return startTime > now && startTime <= tenMinutesFromNow;
        });

        // Notify for Tasks
        for (const task of tasksToNotify) {
            const alreadySent = await db.sentNotification.findUnique({
                where: { externalId: `task-${task.id}` },
            });

            if (!alreadySent) {
                for (const sub of subscriptions) {
                    await sendNotification(sub, {
                        title: 'Upcoming Task',
                        body: `${task.title} starts at ${task.scheduledStartTime}`,
                        url: `/?date=${todayStr}`,
                    });
                }
                await db.sentNotification.create({
                    data: { externalId: `task-${task.id}` },
                });
                notificationsSent.push(`task-${task.id}`);
            }
        }

        // 2. Get recurring tasks starting soon
        const recurringTemplates = await db.recurringTaskTemplate.findMany();

        for (const template of recurringTemplates) {
            const [sy, sm, sd] = template.startDate.split('-').map(Number);
            const startDate = new Date(sy, sm - 1, sd);
            const todayDate = new Date(y, parseInt(m) - 1, parseInt(d));

            if (todayDate < startDate) continue;
            if (template.endDate) {
                const [ey, em, ed] = template.endDate.split('-').map(Number);
                const endDate = new Date(ey, em - 1, ed);
                if (todayDate > endDate) continue;
            }

            const diffTime = todayDate.getTime() - startDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            let matches = false;
            switch (template.frequency) {
                case 'daily':
                    matches = diffDays % template.interval === 0;
                    break;
                case 'weekly': {
                    if (!template.daysOfWeek) break;
                    const targetDow = todayDate.getDay();
                    const allowedDays = template.daysOfWeek.split(',').map(Number);
                    if (!allowedDays.includes(targetDow)) break;
                    const startDow = startDate.getDay();
                    const startWeekStart = new Date(startDate);
                    startWeekStart.setDate(startWeekStart.getDate() - startDow);
                    const targetWeekStart = new Date(todayDate);
                    targetWeekStart.setDate(targetWeekStart.getDate() - targetDow);
                    const weekDiff = Math.round((targetWeekStart.getTime() - startWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                    matches = weekDiff % template.interval === 0;
                    break;
                }
                case 'monthly': {
                    if (template.dayOfMonth === null) break;
                    if (todayDate.getDate() !== template.dayOfMonth) break;
                    const monthDiff = (todayDate.getFullYear() - startDate.getFullYear()) * 12 + (todayDate.getMonth() - startDate.getMonth());
                    matches = monthDiff >= 0 && monthDiff % template.interval === 0;
                    break;
                }
            }

            if (!matches) continue;

            // Check if start time is within next 10 minutes
            const [th, tm] = template.scheduledStartTime.split(':').map(Number);
            const templateStartTime = new Date(now);
            templateStartTime.setHours(th, tm, 0, 0);

            if (templateStartTime > now && templateStartTime <= tenMinutesFromNow) {
                const externalId = `recurring-${template.id}-${todayStr}`;
                const alreadySent = await db.sentNotification.findUnique({
                    where: { externalId },
                });

                if (!alreadySent) {
                    for (const sub of subscriptions) {
                        await sendNotification(sub, {
                            title: 'Upcoming Task',
                            body: `${template.title} starts at ${template.scheduledStartTime}`,
                            url: `/?date=${todayStr}`,
                        });
                    }
                    await db.sentNotification.create({
                        data: { externalId },
                    });
                    notificationsSent.push(externalId);
                }
            }
        }

        // 3. Get GCal events starting soon
        const gcalEvents = await getGoogleCalendarEvents(todayStr);
        const eventsToNotify = gcalEvents.filter((event: any) => {
            if (!event.start?.dateTime) return false;
            const startTime = new Date(event.start.dateTime);
            return startTime > now && startTime <= tenMinutesFromNow;
        });

        // Notify for GCal Events
        for (const event of eventsToNotify) {
            const alreadySent = await db.sentNotification.findUnique({
                where: { externalId: `gcal-${event.id}` },
            });

            if (!alreadySent && event.start?.dateTime) {
                const startTimeStr = new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                for (const sub of subscriptions) {
                    await sendNotification(sub, {
                        title: 'Upcoming Event',
                        body: `${event.summary} starts at ${startTimeStr}`,
                        url: `/?date=${todayStr}`,
                    });
                }
                await db.sentNotification.create({
                    data: { externalId: `gcal-${event.id}` },
                });
                notificationsSent.push(`gcal-${event.id}`);
            }
        }

        return NextResponse.json({ success: true, sentCount: notificationsSent.length, notified: notificationsSent });
    } catch (error) {
        console.error('Error in notification check:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
