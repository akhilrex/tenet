'use client'

import { useDroppable } from "@dnd-kit/core"
import { cn, formatEventTimeRange } from "@/lib/utils"
import { Task, RecurringTaskTemplate } from "@/app/actions"
import { DraggableTaskBlock } from "./draggable-task"
import { useEffect, useState, useMemo } from "react"

const SLOT_HEIGHT = 18 // px per 15 min (Reduced from 30)
const MINUTES_PER_SLOT = 15
const PIXELS_PER_MINUTE = SLOT_HEIGHT / MINUTES_PER_SLOT
const START_HOUR = 0

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin, Users, Video, Clock } from "lucide-react"

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
// 00:00 to 24:00
// 24 hours * 4 slots/hr = 96 slots + 1 for end
const TOTAL_SLOTS = 24 * (60 / MINUTES_PER_SLOT)
const SLOTS = Array.from({ length: Math.floor(TOTAL_SLOTS) }, (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * MINUTES_PER_SLOT
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

// --- Layout Algorithm for Overlaps ---

type LayoutItem = {
    id: string
    start: number // minutes from start of day (0 = 00:00)
    end: number
    type: 'task' | 'event'
    data: any
    // Computed
    top: number
    height: number
    colIndex: number
    totalCols: number
}

function computeLayout(tasks: Task[], events: any[]): LayoutItem[] {
    const items: LayoutItem[] = []

    // 1. Normalize tasks
    tasks.forEach(t => {
        if (!t.scheduledStartTime) return
        const [h, m] = t.scheduledStartTime.split(':').map(Number)
        const start = h * 60 + m
        if (h < START_HOUR) return
        const end = start + t.estimatedMinutes
        items.push({
            id: t.id,
            start,
            end,
            type: 'task',
            data: t,
            top: getOffset(t.scheduledStartTime),
            height: getHeight(t.estimatedMinutes),
            colIndex: 0,
            totalCols: 1
        })
    })

    // 2. Normalize events
    events.forEach(e => {
        if (!e.start) return
        const startDate = new Date(e.start.dateTime || e.start.date)
        const endDate = new Date(e.end.dateTime || e.end.date)

        const startH = startDate.getHours()
        const startM = startDate.getMinutes()
        const start = startH * 60 + startM
        if (startH < START_HOUR) return

        const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
        const end = start + durationMinutes

        items.push({
            id: e.id,
            start,
            end,
            type: 'event',
            data: e,
            top: getOffset(`${startH}:${startM}`),
            height: getHeight(durationMinutes),
            colIndex: 0,
            totalCols: 1
        })
    })

    // 3. Sort by start time
    items.sort((a, b) => a.start - b.start || (b.end - a.end))

    // 4. Group overlapping items
    const activeColumns: number[] = []

    items.forEach(item => {
        let placed = false
        for (let i = 0; i < activeColumns.length; i++) {
            if (activeColumns[i] <= item.start) {
                item.colIndex = i
                activeColumns[i] = item.end
                placed = true
                break
            }
        }
        if (!placed) {
            item.colIndex = activeColumns.length
            activeColumns.push(item.end)
        }
    })

    // Now, determine width.
    items.forEach(item => {
        let maxCol = 0
        items.forEach(other => {
            if (item === other) return
            if (item.start < other.end && other.start < item.end) {
                maxCol = Math.max(maxCol, other.colIndex)
            }
        })
        maxCol = Math.max(maxCol, item.colIndex)
        item.totalCols = maxCol + 1
    })

    return items
}

export function TimeSlot({ time, onClick, isPast }: { time: string, onClick?: () => void, isPast?: boolean }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${time}`,
    })

    const isLabel = time.endsWith(":00")

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "relative transition-colors cursor-pointer hover:bg-muted/30",
                isOver && "bg-primary/5",
                isPast && "bg-muted/10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]",
                time.endsWith(":00") ? "border-b border-border/40" : "border-b border-border/20 border-dashed"
            )}
            style={{ height: SLOT_HEIGHT }}
        >
            {isLabel && (
                <span className="absolute -left-16 top-0 text-xs text-muted-foreground w-14 text-right -translate-y-1/2 select-none">
                    {formatTime12h(time)}
                </span>
            )}
        </div>
    )
}

export function TimeGrid({ tasks, events, onSlotClick, date, templateMap }: { tasks: Task[], events: any[], onSlotClick?: (time: string) => void, date: Date, templateMap?: Map<string, RecurringTaskTemplate> }) {
    const [now, setNow] = useState<Date | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<any>(null)

    useEffect(() => {
        setNow(new Date())
        const interval = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const layoutItems = useMemo(() => computeLayout(tasks, events), [tasks, events])

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

                {/* Render Layout Items */}
                {layoutItems.map(item => {
                    const widthPercent = 100 / item.totalCols
                    const leftPercent = item.colIndex * widthPercent

                    // Add small gap
                    const style = {
                        top: item.top,
                        height: item.height,
                        left: `calc(${leftPercent}% + 8px)`,
                        width: `calc(${widthPercent}% - 16px)`
                    }

                    if (item.type === 'event') {
                        const event = item.data
                        const start = new Date(event.start.dateTime || event.start.date)
                        const end = new Date(event.end.dateTime || event.end.date)
                        const timeRange = formatEventTimeRange(start, end)

                        // Extract attendees, map to names or emails, limit to 2-3
                        const attendees = event.attendees?.filter((a: any) => !a.resource).slice(0, 3) || []

                        return (
                            <div
                                key={event.id}
                                className="absolute bg-muted/80 dark:bg-muted/50 border-l-4 border-muted-foreground/60 rounded px-2 py-1 text-xs overflow-hidden z-20 select-none hover:z-30 transition-all hover:bg-muted cursor-pointer"
                                style={{ ...style, minHeight: 15 }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedEvent(event)
                                }}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <div className="font-semibold text-muted-foreground truncate opacity-90">{event.summary || '(No Title)'}</div>
                                    <div className="text-[10px] text-muted-foreground opacity-70 whitespace-nowrap">
                                        {timeRange}
                                        <span className="ml-1">({Math.round((end.getTime() - start.getTime()) / 60000)}m)</span>
                                    </div>
                                </div>

                                {attendees.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1 opacity-70">
                                        {attendees.map((attendee: any, i: number) => (
                                            <span key={i} className="text-[9px] bg-background/50 px-1 rounded truncate max-w-[80px]">
                                                {attendee.displayName || attendee.email.split('@')[0]}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    } else {
                        const task = item.data as Task
                        const template = task.templateId ? templateMap?.get(task.templateId) : undefined
                        return (
                            <div
                                key={task.id}
                                className="absolute z-20 transition-all duration-300 ease-in-out"
                                style={style}
                            >
                                <DraggableTaskBlock task={task} recurringTemplate={template} className="h-full mb-0 shadow-md" />
                            </div>
                        )
                    }
                })}

            </div>

            {selectedEvent && (
                <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="leading-snug">{selectedEvent.summary}</DialogTitle>
                            <div className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3" />
                                {(() => {
                                    const start = new Date(selectedEvent.start.dateTime || selectedEvent.start.date)
                                    const end = new Date(selectedEvent.end.dateTime || selectedEvent.end.date)
                                    return `${formatEventTimeRange(start, end)} (${Math.round((end.getTime() - start.getTime()) / 60000)}m)`
                                })()}
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            {(selectedEvent.hangoutLink || selectedEvent.location) && (
                                <div className="space-y-2">
                                    {selectedEvent.hangoutLink && (
                                        <Button asChild className="w-full gap-2" variant="default">
                                            <a href={selectedEvent.hangoutLink} target="_blank" rel="noopener noreferrer">
                                                <Video className="w-4 h-4" />
                                                Join Meeting
                                            </a>
                                        </Button>
                                    )}
                                    {selectedEvent.location && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            {selectedEvent.location.match(/^https?:\/\//) ? (
                                                <a
                                                    href={selectedEvent.location}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline hover:text-primary break-all"
                                                >
                                                    {selectedEvent.location}
                                                </a>
                                            ) : (
                                                <span>{selectedEvent.location}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="text-sm bg-muted/30 p-2 rounded max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                                    {selectedEvent.description}
                                </div>
                            )}

                            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Attendees ({selectedEvent.attendees.filter((a: any) => !a.resource).length})
                                    </h4>
                                    <div className="space-y-1">
                                        {selectedEvent.attendees.filter((a: any) => !a.resource).map((attendee: any, i: number) => (
                                            <div key={i} className="text-xs flex items-center justify-between">
                                                <span className="truncate">{attendee.displayName || attendee.email}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${attendee.responseStatus === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    attendee.responseStatus === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {attendee.responseStatus}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
