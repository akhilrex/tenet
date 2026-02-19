'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { addMinutes, format } from "date-fns"

export type Tag = {
    id: string
    name: string
    color: string
}

export type Task = {
    id: string
    title: string
    notes: string | null
    estimatedMinutes: number
    scheduledDate: string | null
    scheduledStartTime: string | null
    isCompleted: boolean
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
    tagId: string | null
    tag?: Tag | null
    recurringTemplateId?: string | null
    recurringDate?: string | null
    // Virtual-only fields (not in DB, added at runtime)
    isVirtualRecurring?: boolean
    templateId?: string
}

export type RecurringTaskTemplate = {
    id: string
    title: string
    notes: string | null
    estimatedMinutes: number
    scheduledStartTime: string
    frequency: string
    daysOfWeek: string | null
    dayOfMonth: number | null
    interval: number
    startDate: string
    endDate: string | null
    tagId: string | null
    tag?: Tag | null
    createdAt: Date
    updatedAt: Date
}

export async function getTasks(date: string) {
    const tasks = await db.task.findMany({
        where: {
            OR: [
                { scheduledDate: date },
                { scheduledStartTime: null },
                { scheduledStartTime: "" },
                { scheduledDate: null },
                { scheduledDate: "" }
            ]
        },
        include: {
            tag: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
    return tasks
}

export async function getTags() {
    return await db.tag.findMany({
        orderBy: { name: 'asc' }
    })
}

export async function createTag(name: string, color: string) {
    await db.tag.create({
        data: { name, color }
    })
    revalidatePath('/')
}

export async function createTask(data: { title: string, notes?: string, estimatedMinutes: number, scheduledDate?: string | null, scheduledStartTime?: string | null, tagId?: string | null }) {
    await db.task.create({
        data: {
            title: data.title,
            notes: data.notes,
            estimatedMinutes: data.estimatedMinutes,
            scheduledDate: data.scheduledDate,
            scheduledStartTime: data.scheduledStartTime,
            isCompleted: false,
            tagId: data.tagId
        }
    })
    revalidatePath('/')
}

export async function updateTask(id: string, data: Partial<Task> & { tagId?: string | null }) {
    const { id: _, tag, ...updateData } = data
    // Remove 'tag' object if present to avoid prisma error, we use tagId

    await db.task.update({
        where: { id },
        data: updateData
    })
    revalidatePath('/')
}

export async function deleteTask(id: string) {
    await db.task.delete({
        where: { id }
    })
    revalidatePath('/')
}

// --- Recurring Task Actions ---

export async function createRecurringTask(data: {
    title: string
    notes?: string
    estimatedMinutes: number
    scheduledStartTime: string
    frequency: string
    daysOfWeek?: string | null
    dayOfMonth?: number | null
    interval?: number
    startDate: string
    endDate?: string | null
    tagId?: string | null
}) {
    await db.recurringTaskTemplate.create({
        data: {
            title: data.title,
            notes: data.notes,
            estimatedMinutes: data.estimatedMinutes,
            scheduledStartTime: data.scheduledStartTime,
            frequency: data.frequency,
            daysOfWeek: data.daysOfWeek,
            dayOfMonth: data.dayOfMonth,
            interval: data.interval ?? 1,
            startDate: data.startDate,
            endDate: data.endDate,
            tagId: data.tagId,
        }
    })
    revalidatePath('/')
}

export async function updateRecurringTask(id: string, data: Partial<RecurringTaskTemplate>) {
    const { id: _, tag, createdAt, updatedAt, ...updateData } = data as any
    await db.recurringTaskTemplate.update({
        where: { id },
        data: updateData
    })
    revalidatePath('/')
}

export async function deleteRecurringTask(id: string) {
    await db.recurringTaskTemplate.delete({
        where: { id }
    })
    revalidatePath('/')
}

export async function getRecurringTemplates() {
    return await db.recurringTaskTemplate.findMany({
        include: { tag: true }
    })
}

function doesTemplateMatchDate(template: RecurringTaskTemplate, dateStr: string): boolean {
    const [ty, tm, td] = dateStr.split('-').map(Number)
    const targetDate = new Date(ty, tm - 1, td)

    const [sy, sm, sd] = template.startDate.split('-').map(Number)
    const startDate = new Date(sy, sm - 1, sd)

    // Must be on or after start date
    if (targetDate < startDate) return false

    // Must be on or before end date (if set)
    if (template.endDate) {
        const [ey, em, ed] = template.endDate.split('-').map(Number)
        const endDate = new Date(ey, em - 1, ed)
        if (targetDate > endDate) return false
    }

    const diffTime = targetDate.getTime() - startDate.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    switch (template.frequency) {
        case 'daily':
            return diffDays % template.interval === 0

        case 'weekly': {
            if (!template.daysOfWeek) return false
            const targetDow = targetDate.getDay() // 0=Sun, 6=Sat
            const allowedDays = template.daysOfWeek.split(',').map(Number)
            if (!allowedDays.includes(targetDow)) return false
            // Check week interval
            const diffWeeks = Math.floor(diffDays / 7)
            // For weekly interval, check if we're in the right week
            // We calculate weeks from startDate
            const startDow = startDate.getDay()
            // Calculate the start of the week containing startDate
            const startWeekStart = new Date(startDate)
            startWeekStart.setDate(startWeekStart.getDate() - startDow)
            const targetWeekStart = new Date(targetDate)
            targetWeekStart.setDate(targetWeekStart.getDate() - targetDow)
            const weekDiff = Math.round((targetWeekStart.getTime() - startWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
            return weekDiff % template.interval === 0
        }

        case 'monthly': {
            if (template.dayOfMonth === null || template.dayOfMonth === undefined) return false
            if (targetDate.getDate() !== template.dayOfMonth) return false
            // Check month interval
            const monthDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth())
            return monthDiff >= 0 && monthDiff % template.interval === 0
        }

        default:
            return false
    }
}

export async function getRecurringTasksForDate(dateStr: string): Promise<Task[]> {
    const templates = await db.recurringTaskTemplate.findMany({
        include: { tag: true }
    })

    // Find already-materialized tasks for this date
    const materializedTasks = await db.task.findMany({
        where: {
            recurringTemplateId: { not: null },
            recurringDate: dateStr,
        }
    })

    const materializedTemplateIds = new Set(materializedTasks.map(t => t.recurringTemplateId))

    const virtualTasks: Task[] = []

    for (const template of templates) {
        if (!doesTemplateMatchDate(template, dateStr)) continue
        // Skip if already materialized
        if (materializedTemplateIds.has(template.id)) continue

        virtualTasks.push({
            id: `virtual-${template.id}-${dateStr}`,
            title: template.title,
            notes: template.notes,
            estimatedMinutes: template.estimatedMinutes,
            scheduledDate: dateStr,
            scheduledStartTime: template.scheduledStartTime,
            isCompleted: false,
            completedAt: null,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            tagId: template.tagId,
            tag: template.tag,
            recurringTemplateId: template.id,
            recurringDate: dateStr,
            isVirtualRecurring: true,
            templateId: template.id,
        })
    }

    return virtualTasks
}

export async function materializeRecurringTask(templateId: string, dateStr: string): Promise<Task> {
    // Check if already materialized
    const existing = await db.task.findFirst({
        where: {
            recurringTemplateId: templateId,
            recurringDate: dateStr,
        },
        include: { tag: true }
    })
    if (existing) return existing

    const template = await db.recurringTaskTemplate.findUnique({
        where: { id: templateId },
        include: { tag: true }
    })
    if (!template) throw new Error("Template not found")

    const task = await db.task.create({
        data: {
            title: template.title,
            notes: template.notes,
            estimatedMinutes: template.estimatedMinutes,
            scheduledDate: dateStr,
            scheduledStartTime: template.scheduledStartTime,
            tagId: template.tagId,
            isCompleted: false,
            recurringTemplateId: template.id,
            recurringDate: dateStr,
        },
        include: { tag: true }
    })

    revalidatePath('/')
    return task
}

import { google } from 'googleapis'

function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
        return null
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    return oauth2Client
}

export async function getGoogleCalendarEvents(date: string) {
    const auth = getOAuth2Client()
    if (!auth) return []

    const timeMin = new Date(date)
    timeMin.setHours(0, 0, 0, 0)
    const timeMax = new Date(date)
    timeMax.setHours(23, 59, 59, 999)

    try {
        const calendar = google.calendar({ version: 'v3', auth })
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        })

        return res.data.items || []
    } catch (e) {
        console.error("Error fetching Google Calendar events", e)
        return []
    }
}

export async function pushTaskToCalendar(taskId: string) {
    const task = await db.task.findUnique({ where: { id: taskId } })
    if (!task || !task.scheduledDate || !task.scheduledStartTime) {
        throw new Error("Task not scheduled properly")
    }

    const auth = getOAuth2Client()
    if (!auth) throw new Error("Google Calendar not configured")

    const startDateTimeString = `${task.scheduledDate}T${task.scheduledStartTime}:00`
    const startDate = new Date(startDateTimeString)
    const endDate = addMinutes(startDate, task.estimatedMinutes)

    const startString = format(startDate, "yyyy-MM-dd'T'HH:mm:ss")
    const endString = format(endDate, "yyyy-MM-dd'T'HH:mm:ss")

    try {
        const calendar = google.calendar({ version: 'v3', auth })
        await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: task.title,
                description: task.notes || undefined,
                start: {
                    dateTime: startString,
                    timeZone: 'Asia/Kolkata'
                },
                end: {
                    dateTime: endString,
                    timeZone: 'Asia/Kolkata'
                }
            }
        })
        return { success: true }
    } catch (e) {
        console.error("Error pushing to calendar", e)
        return { success: false, error: "Failed to push to calendar" }
    }
}
