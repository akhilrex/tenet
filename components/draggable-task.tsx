'use client'

import { useDraggable } from "@dnd-kit/core"
import { TaskBlock } from "./task-block"
import { Task, updateTask } from "@/app/actions"
import { CSS } from "@dnd-kit/utilities"
import { useState } from "react"
import { TaskForm } from "./task-form"
import { cn } from "@/lib/utils"

export function DraggableTaskBlock({ task, className }: { task: Task, className?: string }) {
    const [editOpen, setEditOpen] = useState(false)
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <>
            <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn("mb-2 touch-none h-fit", className)}>
                <TaskBlock
                    task={task}
                    className="h-full"
                    onClick={() => setEditOpen(true)}
                />
            </div>
            <TaskForm
                task={task}
                open={editOpen}
                onOpenChange={setEditOpen}
                trigger={<span className="hidden" />}
            />
        </>
    )
}
