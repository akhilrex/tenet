"use client"

import { Card } from "@/components/ui/card"
import { Task, updateTask, deleteTask, materializeRecurringTask } from "@/app/actions"
import { cn, formatTimeRange } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Repeat } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"
import { toast } from "sonner"

interface TaskBlockProps {
    task: Task
    isOverlay?: boolean
    className?: string
    style?: React.CSSProperties
    onClick?: () => void
}

export function TaskBlock({ task, isOverlay, className, style, onClick }: TaskBlockProps) {
    const [isHovered, setIsHovered] = useState(false)

    const isRecurring = !!(task.isVirtualRecurring || task.recurringTemplateId)

    const handleComplete = async (checked: boolean) => {
        if (task.isVirtualRecurring && task.templateId && task.recurringDate) {
            // Materialize first, then mark complete
            const materialized = await materializeRecurringTask(task.templateId, task.recurringDate)
            await updateTask(materialized.id, { isCompleted: checked, completedAt: checked ? new Date() : null })
        } else {
            await updateTask(task.id, { isCompleted: checked, completedAt: checked ? new Date() : null })
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm("Delete this task?")) {
            await deleteTask(task.id)
            toast.success("Task deleted")
        }
    }

    // Determine colors based on tag
    const borderColor = task.tag ? task.tag.color : "oklch(var(--primary))"
    const bgColor = task.tag ? task.tag.color + "20" : "bg-card" // 20 for transparency approx if hex, simple fallback if name

    return (
        <Card
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "p-2 text-xs font-medium cursor-grab active:cursor-grabbing hover:ring-2 ring-primary/50 transition-all text-card-foreground border rounded-md relative group shadow-sm",
                task.isCompleted && "line-through opacity-50 border-muted-foreground",
                isOverlay && "shadow-xl rotate-2 scale-105 z-50",
                className
            )}
            style={{
                ...style,
                borderColor: task.isCompleted ? undefined : (task.tag ? task.tag.color : undefined),
                // borderLeftColor is handled by className usually, but we overwrite here
            }}
        >
            <div className="flex items-start gap-2">
                {!isOverlay && (
                    <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={handleComplete}
                        className="w-3 h-3 mt-0.5 rounded-sm data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="truncate font-semibold">{task.title}</div>
                        <div className="text-[10px] opacity-60 whitespace-nowrap">
                            {task.scheduledStartTime ? (
                                <>
                                    {formatTimeRange(task.scheduledStartTime, task.estimatedMinutes)}
                                    <span className="ml-1 opacity-70">({task.estimatedMinutes}m)</span>
                                </>
                            ) : (
                                <span>{task.estimatedMinutes}m</span>
                            )}
                        </div>
                    </div>
                    {task.notes && (
                        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                            {task.notes}
                        </div>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                        {task.tag && (
                            <span
                                className="text-[9px] px-1 rounded-sm text-white"
                                style={{ backgroundColor: task.tag.color }}
                            >
                                {task.tag.name}
                            </span>
                        )}
                        {isRecurring && (
                            <Repeat className="h-2.5 w-2.5 text-muted-foreground opacity-70" />
                        )}
                    </div>
                </div>
                {!isOverlay && isHovered && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 absolute top-1 right-1 opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </Card>
    )
}
