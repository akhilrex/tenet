'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createTask, updateTask, deleteTask, Task, createTag, getTags, Tag, pushTaskToCalendar } from "@/app/actions"
import { Plus, Calendar, Loader2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

interface TaskFormProps {
    task?: Task
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    defaultDate?: string
    defaultTime?: string
}

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#a855f7", // purple
    "#ec4899", // pink
]

export function TaskForm({ task, open, onOpenChange, trigger, defaultDate, defaultTime }: TaskFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [title, setTitle] = useState(task?.title || "")
    const [notes, setNotes] = useState(task?.notes || "")
    const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes || 60)

    // Scheduled state
    const [scheduledDate, setScheduledDate] = useState(task?.scheduledDate || defaultDate || "")
    const [scheduledStartTime, setScheduledStartTime] = useState(task?.scheduledStartTime || defaultTime || "")

    // Tag state
    const [tags, setTags] = useState<Tag[]>([])
    const [selectedTagId, setSelectedTagId] = useState<string | null>(task?.tagId || null)
    const [newTagName, setNewTagName] = useState("")
    const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
    const [isCreatingTag, setIsCreatingTag] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Controlled vs Uncontrolled
    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

    // Load tags on mount
    useEffect(() => {
        getTags().then(setTags)
    }, [])

    const handlePushToCalendar = async () => {
        if (!task) return
        if (confirm("Push this task to your Google Calendar?")) {
            const loadingToast = toast.loading("Pushing to calendar...")
            const res = await pushTaskToCalendar(task.id)
            toast.dismiss(loadingToast)
            if (res.success) {
                toast.success("Pushed to calendar!")
            } else {
                toast.error("Failed to push: " + (res.error || "Unknown error"))
            }
        }
    }

    const handleCreateTag = async () => {
        if (!newTagName) return
        await createTag(newTagName, newTagColor)
        const updatedTags = await getTags()
        setTags(updatedTags)

        // Auto select the new tag
        const newTag = updatedTags.find((t: Tag) => t.name === newTagName)
        if (newTag) setSelectedTagId(newTag.id)

        setNewTagName("")
        setIsCreatingTag(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const payload = {
                title,
                notes,
                estimatedMinutes,
                // If there's no time, there's no date (global unscheduled)
                scheduledDate: scheduledStartTime ? (scheduledDate || null) : null,
                scheduledStartTime: scheduledStartTime || null,
                tagId: selectedTagId
            }

            if (task) {
                await updateTask(task.id, payload)
            } else {
                await createTask(payload)
            }
            setIsOpen(false)
            // Reset form if creating
            if (!task) {
                setTitle("")
                setNotes("")
                setEstimatedMinutes(60)
                setScheduledDate(defaultDate || "")
                setScheduledStartTime(defaultTime || "")
                setSelectedTagId(null)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to save task")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Effect to accept new defaults when opening
    useEffect(() => {
        if (isOpen && !task) {
            if (defaultDate) setScheduledDate(defaultDate)
            if (defaultTime) setScheduledStartTime(defaultTime)
        }
    }, [isOpen, defaultDate, defaultTime, task])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Add Task</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus={!task} />
                    </div>

                    {/* Date/Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                type="date"
                                id="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <Input
                                type="time"
                                id="time"
                                value={scheduledStartTime}
                                onChange={(e) => setScheduledStartTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Tag</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <Badge
                                    key={tag.id}
                                    variant={selectedTagId === tag.id ? "default" : "outline"}
                                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                                    className="cursor-pointer"
                                    style={{
                                        backgroundColor: selectedTagId === tag.id ? tag.color : undefined,
                                        borderColor: tag.color,
                                        color: selectedTagId === tag.id ? '#fff' : undefined // Basic query for contrast
                                    }}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                            <Popover open={isCreatingTag} onOpenChange={setIsCreatingTag}>
                                <PopoverTrigger asChild>
                                    <Badge variant="secondary" className="cursor-pointer border-dashed border-2 hover:bg-muted">+ New Tag</Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none text-sm">Create Tag</h4>
                                        <Input
                                            placeholder="Tag Name"
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                        <div className="flex gap-1 flex-wrap">
                                            {PRESET_COLORS.map(c => (
                                                <div
                                                    key={c}
                                                    className={`w-5 h-5 rounded-full cursor-pointer border ${newTagColor === c ? 'ring-2 ring-primary' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setNewTagColor(c)}
                                                />
                                            ))}
                                        </div>
                                        <Button size="sm" onClick={handleCreateTag} disabled={!newTagName} className="w-full h-8">Add</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minutes">Duration (minutes)</Label>
                        <Input
                            type="number"
                            id="minutes"
                            value={estimatedMinutes}
                            onChange={(e) => setEstimatedMinutes(parseInt(e.target.value))}
                            step={15}
                            min={15}
                        />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        {task && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={async () => {
                                    if (confirm("Are you sure you want to delete this task?")) {
                                        await deleteTask(task.id)
                                        setIsOpen(false)
                                        toast.success("Task deleted")
                                    }
                                }}
                                title="Delete Task"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}

                        <div className="flex gap-2 ml-auto">
                            {task && task.scheduledDate && task.scheduledStartTime && (
                                <Button type="button" variant="outline" size="icon" onClick={handlePushToCalendar} title="Push to Google Calendar">
                                    <Calendar className="h-4 w-4" />
                                </Button>
                            )}
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {task ? "Save Changes" : "Create Task"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
