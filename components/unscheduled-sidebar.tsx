'use client'

import { Task } from "@/app/actions"
import { DraggableTaskBlock } from "./draggable-task"
import { ScrollArea } from "./ui/scroll-area"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

export function UnscheduledSidebar({ tasks }: { tasks: Task[] }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'unscheduled-zone'
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-full md:w-80 flex flex-col h-full bg-muted/10 border-r p-4 rounded-lg border",
                isOver && "bg-muted/30 ring-2 ring-primary/20"
            )}
        >
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Unscheduled</h2>
            <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4 pb-20">
                    {tasks.map(task => (
                        <DraggableTaskBlock key={task.id} task={task} />
                    ))}
                    {tasks.length === 0 && (
                        <div className="text-sm text-center text-muted-foreground mt-10">
                            All caught up!
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
