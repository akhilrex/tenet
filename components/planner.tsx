'use client'

import { useState } from "react"
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
import { Task, updateTask } from "@/app/actions"
import { TaskBlock } from "./task-block"
import { UnscheduledSidebar } from "./unscheduled-sidebar"
import { TimeGrid } from "./time-grid"
import { TaskForm } from "./task-form"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "./ui/button"
import { ListTodo } from "lucide-react"

export function Planner({ tasks, date, calendarEvents }: { tasks: Task[], date: Date, calendarEvents: any[] }) {
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [createFormOpen, setCreateFormOpen] = useState(false)
    const [createFormTime, setCreateFormTime] = useState("")

    // Fix timezone issue: use local format matching the searchParam "YYYY-MM-DD"
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id)
        if (task) setActiveTask(task)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over) return

        const taskId = active.id as string
        const overId = over.id as string

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

    const scheduledTasks = tasks.filter(t => t.scheduledStartTime && t.scheduledDate === dateStr)
    const unscheduledTasks = tasks.filter(t => !t.scheduledStartTime)

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-4 relative">

                {/* Desktop Sidebar, hidden on mobile */}
                <div className="hidden md:flex h-full">
                    <UnscheduledSidebar tasks={unscheduledTasks} />
                </div>

                {/* Mobile & Desktop TimeGrid */}
                <TimeGrid tasks={scheduledTasks} events={calendarEvents} onSlotClick={handleSlotClick} date={date} />

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
            </div>
            <DragOverlay>
                {activeTask ? <TaskBlock task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    )
}
