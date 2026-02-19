'use client'

import { useDraggable } from "@dnd-kit/core"
import { TaskBlock } from "./task-block"
import { Task, RecurringTaskTemplate } from "@/app/actions"
import { CSS } from "@dnd-kit/utilities"
import { useState } from "react"
import { TaskForm } from "./task-form"
import { cn } from "@/lib/utils"

export function DraggableTaskBlock({ task, recurringTemplate, className }: { task: Task, recurringTemplate?: RecurringTaskTemplate, className?: string }) {
    const [editOpen, setEditOpen] = useState(false)
    const isVirtual = !!task.isVirtualRecurring

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: isVirtual,
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <>
            <div
                ref={isVirtual ? undefined : setNodeRef}
                style={isVirtual ? undefined : style}
                {...(isVirtual ? {} : { ...listeners, ...attributes })}
                className={cn("mb-2 touch-none h-fit", isVirtual && "cursor-pointer", className)}
            >
                <TaskBlock
                    task={task}
                    className="h-full"
                    onClick={() => setEditOpen(true)}
                />
            </div>
            <TaskForm
                task={isVirtual ? undefined : task}
                recurringTemplate={recurringTemplate}
                open={editOpen}
                onOpenChange={setEditOpen}
                trigger={<span className="hidden" />}
            />
        </>
    )
}
