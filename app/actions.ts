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
                { scheduledDate: null }
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

export async function getGoogleCalendarEvents(date: string) {
    const token = process.env.GOOGLE_ACCESS_TOKEN
    if (!token) return []

    const timeMin = new Date(date)
    timeMin.setHours(0, 0, 0, 0)
    const timeMax = new Date(date)
    timeMax.setHours(23, 59, 59, 999)

    try {
        const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime'
        })

        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: 'no-store'
        })

        if (!res.ok) {
            console.error("Failed to fetch Google Calendar events", await res.text())
            // Return empty array for now instead of throwing to avoid crashing page
            return []
        }

        const data = await res.json()
        return data.items || []
    } catch (e) {
        console.error("Error fetching Google Calendar events", e)
        return []
    }
}
