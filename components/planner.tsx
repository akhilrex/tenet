'use client'

import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import {
    DndContext,
    DragOverlay,
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor
} from "@dnd-kit/core"
import { Task, updateTask, RecurringTaskTemplate, getRecurringTemplates, materializeRecurringTask } from "@/app/actions"
import { TaskBlock } from "./task-block"
import { UnscheduledSidebar } from "./unscheduled-sidebar"
import { TimeGrid } from "./time-grid"
import { TaskForm } from "./task-form"
import { triggerLoading } from "./top-progress-bar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "./ui/button"
import { ListTodo } from "lucide-react"

export function Planner({ tasks, recurringTasks, date, calendarEvents }: { tasks: Task[], recurringTasks: Task[], date: Date, calendarEvents: any[] }) {
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [createFormOpen, setCreateFormOpen] = useState(false)
    const [createFormTime, setCreateFormTime] = useState("")
    const [recurringFormOpen, setRecurringFormOpen] = useState(false)
    const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([])

    // Fix timezone issue: use local format matching the searchParam "YYYY-MM-DD"
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    // Load templates for editing
    useEffect(() => {
        getRecurringTemplates().then(setTemplates)
    }, [recurringTasks])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    )

    const router = useRouter()

    // Merge regular tasks and recurring virtual tasks
    const allTasks = useMemo(() => {
        return [...tasks, ...recurringTasks]
    }, [tasks, recurringTasks])

    // Build a lookup from templateId -> template
    const templateMap = useMemo(() => {
        const map = new Map<string, RecurringTaskTemplate>()
        templates.forEach(t => map.set(t.id, t))
        return map
    }, [templates])

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignore if in input/textarea/editable
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                (document.activeElement as HTMLElement)?.isContentEditable
            ) {
                return
            }

            const key = e.key.toLowerCase()

            if (key === 'c') {
                e.preventDefault()
                setCreateFormTime("")
                setCreateFormOpen(true)
            } else if (key === 'r') {
                e.preventDefault()
                setRecurringFormOpen(true)
            } else if (key === 't') {
                e.preventDefault()
                triggerLoading('start')
                router.push('/')
            } else if (key === 'n') {
                e.preventDefault()
                triggerLoading('start')
                const next = new Date(date)
                next.setDate(next.getDate() + 1)
                updateUrl(next)
            } else if (key === 'p') {
                e.preventDefault()
                triggerLoading('start')
                const prev = new Date(date)
                prev.setDate(prev.getDate() - 1)
                updateUrl(prev)
            }
        }

        const updateUrl = (d: Date) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            router.push(`/?date=${y}-${m}-${day}`)
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [date, router])

    useEffect(() => {
        triggerLoading('end')
    }, [date])

    const handleDragStart = (event: DragStartEvent) => {
        const task = allTasks.find(t => t.id === event.active.id)
        if (task && !task.isVirtualRecurring) setActiveTask(task)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over) return

        const taskId = active.id as string
        const overId = over.id as string

        // Don't allow dragging virtual recurring tasks
        const task = allTasks.find(t => t.id === taskId)
        if (task?.isVirtualRecurring) return

        if (overId.startsWith("slot-")) {
            const time = overId.replace("slot-", "")

            await updateTask(taskId, {
                scheduledDate: dateStr,
                scheduledStartTime: time
            })
        } else if (overId === "unscheduled-zone") {
            await updateTask(taskId, {
                scheduledDate: null,
                scheduledStartTime: null
            })
        }
    }

    const handleSlotClick = (time: string) => {
        setCreateFormTime(time)
        setCreateFormOpen(true)
    }

    // A task is scheduled on the grid only if it has a time AND its date matches the current view
    const scheduledTasks = allTasks.filter(t =>
        t.scheduledStartTime &&
        t.scheduledStartTime !== "" &&
        t.scheduledDate === dateStr
    )

    // A task is unscheduled (sidebar) if it has no time OR no date
    const unscheduledTasks = allTasks.filter(t =>
        !t.scheduledStartTime ||
        t.scheduledStartTime === "" ||
        !t.scheduledDate ||
        t.scheduledDate === "" ||
        t.scheduledDate !== dateStr
    ).filter(t => !scheduledTasks.includes(t))

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-4 relative">

                {/* Desktop Sidebar, hidden on mobile */}
                <div className="hidden md:flex h-full">
                    <UnscheduledSidebar tasks={unscheduledTasks} />
                </div>

                {/* Mobile & Desktop TimeGrid */}
                <TimeGrid tasks={scheduledTasks} events={calendarEvents} onSlotClick={handleSlotClick} date={date} templateMap={templateMap} />

                {/* Mobile Unscheduled Button & Sheet */}
                <div className="fixed bottom-24 right-8 md:hidden z-40">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" className="rounded-full shadow-lg h-12 w-12" variant="secondary">
                                <ListTodo className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[80vh]">
                            <SheetHeader>
                                <SheetTitle>Unscheduled Tasks</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 h-full">
                                <UnscheduledSidebar tasks={unscheduledTasks} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Mobile FAB for Create */}
                <div className="fixed bottom-8 right-8 md:hidden z-50">
                    <TaskForm defaultDate={dateStr} />
                </div>

                {/* Slot Click Form */}
                <TaskForm
                    open={createFormOpen}
                    onOpenChange={setCreateFormOpen}
                    defaultDate={dateStr}
                    defaultTime={createFormTime}
                    trigger={<span className="hidden" />}
                />

                {/* Recurring Task Create Form (triggered by R key) */}
                <TaskForm
                    open={recurringFormOpen}
                    onOpenChange={setRecurringFormOpen}
                    defaultDate={dateStr}
                    defaultRecurring={true}
                    trigger={<span className="hidden" />}
                />
            </div>
            <DragOverlay>
                {activeTask ? <TaskBlock task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    )
}
