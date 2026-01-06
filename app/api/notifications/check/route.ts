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

        // 2. Get GCal events starting soon
        const gcalEvents = await getGoogleCalendarEvents(todayStr);
        const eventsToNotify = gcalEvents.filter((event: any) => {
            if (!event.start?.dateTime) return false;
            const startTime = new Date(event.start.dateTime);
            return startTime > now && startTime <= tenMinutesFromNow;
        });

        // 3. Get all subscriptions
        const subscriptions = await db.pushSubscription.findMany();

        if (subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found' });
        }

        const notificationsSent = [];

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
