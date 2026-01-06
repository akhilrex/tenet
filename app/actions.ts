'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

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

    const [h, m] = task.scheduledStartTime.split(':').map(Number)
    const startDateTime = new Date(task.scheduledDate)
    startDateTime.setHours(h, m, 0, 0)

    const endDateTime = new Date(startDateTime.getTime() + task.estimatedMinutes * 60000)

    try {
        const calendar = google.calendar({ version: 'v3', auth })
        await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: task.title,
                description: task.notes || undefined,
                start: { dateTime: startDateTime.toISOString() },
                end: { dateTime: endDateTime.toISOString() }
            }
        })
        return { success: true }
    } catch (e) {
        console.error("Error pushing to calendar", e)
        return { success: false, error: "Failed to push to calendar" }
    }
}
