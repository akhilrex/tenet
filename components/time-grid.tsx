'use client'

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Task } from "@/app/actions"
import { DraggableTaskBlock } from "./draggable-task"
import { useEffect, useState } from "react"

const SLOT_HEIGHT = 60 // px
const MINUTES_PER_SLOT = 30
const PIXELS_PER_MINUTE = SLOT_HEIGHT / MINUTES_PER_SLOT
const START_HOUR = 6

function getOffset(timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number)
    const totalMinutes = h * 60 + m
    const startMinutes = START_HOUR * 60
    return (totalMinutes - startMinutes) * PIXELS_PER_MINUTE
}

function getHeight(minutes: number) {
    return minutes * PIXELS_PER_MINUTE
}

function formatTime12h(time24: string) {
    const [h, m] = time24.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Generate slots
// 06:00 to 22:00
const SLOTS = Array.from({ length: 33 }, (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * 30
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

export function TimeSlot({ time, onClick, isPast }: { time: string, onClick?: () => void, isPast?: boolean }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${time}`,
    })

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "relative border-b border-border/50 transition-colors cursor-pointer hover:bg-muted/30",
                isOver && "bg-primary/5",
                isPast && "bg-muted/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]"
            )}
            style={{ height: SLOT_HEIGHT }}
        >
            <span className="absolute -left-16 top-0 text-xs text-muted-foreground w-14 text-right -translate-y-1/2 select-none">
                {formatTime12h(time)}
            </span>
        </div>
    )
}

export function TimeGrid({ tasks, events, onSlotClick, date }: { tasks: Task[], events: any[], onSlotClick?: (time: string) => void, date: Date }) {
    const [now, setNow] = useState<Date | null>(null)

    useEffect(() => {
        setNow(new Date())
        const interval = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const isToday = now && date.toDateString() === now.toDateString()

    // Calculate current time line offset
    let nowOffset = -1
    if (isToday && now) {
        const h = now.getHours()
        const m = now.getMinutes()
        const totalMinutes = h * 60 + m
        const startMinutes = START_HOUR * 60
        if (totalMinutes >= startMinutes) {
            nowOffset = (totalMinutes - startMinutes) * PIXELS_PER_MINUTE
        }
    }

    return (
        <div className="flex-1 h-full overflow-y-auto relative bg-background rounded-lg border shadow-sm pl-16 pr-4 py-4 scrollbar-hide">
            <div className="relative" style={{ height: SLOT_HEIGHT * SLOTS.length }}>
                {/* Grid Background */}
                {SLOTS.map(time => {
                    // Check if this slot is in the past
                    let isPast = false
                    if (isToday && now) {
                        const slotOffset = getOffset(time)
                        if (nowOffset > slotOffset + SLOT_HEIGHT) {
                            isPast = true
                        }
                    } else if (now && date < now && !isToday) {
                        // Careful with date comparison, strict object compare might fail if time diff.
                        // Check if date is strictly before today (ignoring time)
                        const todayStart = new Date(now)
                        todayStart.setHours(0, 0, 0, 0)
                        const viewStart = new Date(date)
                        viewStart.setHours(0, 0, 0, 0)
                        if (viewStart < todayStart) isPast = true
                    }

                    return (
                        <TimeSlot
                            key={time}
                            time={time}
                            onClick={() => onSlotClick?.(time)}
                            isPast={isPast}
                        />
                    )
                })}

                {/* Current Time Indicator */}
                {isToday && nowOffset >= 0 && (
                    <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                        style={{ top: nowOffset }}
                    >
                        <div className="absolute -left-2 w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                )}

                {/* Events Layer */}
                {events.map((event: any) => {
                    if (!event.start) return null
                    const startDate = new Date(event.start.dateTime || event.start.date)
                    const endDate = new Date(event.end.dateTime || event.end.date)

                    const startH = startDate.getHours()
                    const startM = startDate.getMinutes()
                    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)

                    if (startH < 6) return null

                    const top = getOffset(`${startH}:${startM}`)
                    const height = getHeight(durationMinutes)

                    return (
                        <div
                            key={event.id}
                            className="absolute left-2 right-2 bg-muted/50 border-l-4 border-muted-foreground/30 rounded px-2 py-1 text-xs overflow-hidden z-10 select-none pointer-events-none"
                            style={{ top, height, minHeight: 20 }}
                        >
                            <div className="font-semibold text-muted-foreground truncate">{event.summary || '(No Title)'}</div>
                        </div>
                    )
                })}

                {/* Tasks Layer */}
                {tasks.map(task => {
                    if (!task.scheduledStartTime) return null
                    const top = getOffset(task.scheduledStartTime)
                    const height = getHeight(task.estimatedMinutes)

                    return (
                        <div
                            key={task.id}
                            className="absolute left-8 right-8 z-20 transition-all duration-300 ease-in-out"
                            style={{ top, height }}
                        >
                            <DraggableTaskBlock task={task} className="h-full mb-0 shadow-md" />
                        </div>
                    )
                })}

            </div>
        </div>
    )
}
