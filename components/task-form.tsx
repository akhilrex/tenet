'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    createTask, updateTask, deleteTask, Task, createTag, getTags, Tag,
    pushTaskToCalendar, RecurringTaskTemplate, createRecurringTask,
    updateRecurringTask, deleteRecurringTask, materializeRecurringTask
} from "@/app/actions"
import { Plus, Calendar, Loader2, Trash2, Repeat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskFormProps {
    task?: Task
    recurringTemplate?: RecurringTaskTemplate
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    defaultDate?: string
    defaultTime?: string
    defaultRecurring?: boolean
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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function TaskForm({ task, recurringTemplate, open, onOpenChange, trigger, defaultDate, defaultTime, defaultRecurring }: TaskFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [notes, setNotes] = useState("")
    const [estimatedMinutes, setEstimatedMinutes] = useState(60)

    // Scheduled state
    const [scheduledDate, setScheduledDate] = useState("")
    const [scheduledStartTime, setScheduledStartTime] = useState("")

    // Recurring state
    const [isRepeat, setIsRepeat] = useState(false)
    const [frequency, setFrequency] = useState<string>("weekly")
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
    const [dayOfMonth, setDayOfMonth] = useState<number>(1)
    const [interval, setInterval] = useState<number>(1)
    const [endDate, setEndDate] = useState<string>("")

    // Tag state
    const [tags, setTags] = useState<Tag[]>([])
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
    const [newTagName, setNewTagName] = useState("")
    const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
    const [isCreatingTag, setIsCreatingTag] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Controlled vs Uncontrolled
    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

    // Determine if we're editing a recurring template
    const isEditingTemplate = !!recurringTemplate

    // Load tags on mount
    useEffect(() => {
        getTags().then(setTags)
    }, [])

    // Populate form when opening
    useEffect(() => {
        if (isOpen) {
            if (recurringTemplate) {
                // Editing a recurring template
                setTitle(recurringTemplate.title)
                setNotes(recurringTemplate.notes || "")
                setEstimatedMinutes(recurringTemplate.estimatedMinutes)
                setScheduledStartTime(recurringTemplate.scheduledStartTime)
                setScheduledDate(recurringTemplate.startDate)
                setSelectedTagId(recurringTemplate.tagId || null)
                setIsRepeat(true)
                setFrequency(recurringTemplate.frequency)
                setDaysOfWeek(recurringTemplate.daysOfWeek ? recurringTemplate.daysOfWeek.split(',').map(Number) : [])
                setDayOfMonth(recurringTemplate.dayOfMonth ?? 1)
                setInterval(recurringTemplate.interval)
                setEndDate(recurringTemplate.endDate || "")
            } else if (task) {
                // Editing a regular task
                setTitle(task.title)
                setNotes(task.notes || "")
                setEstimatedMinutes(task.estimatedMinutes)
                setScheduledDate(task.scheduledDate || defaultDate || "")
                setScheduledStartTime(task.scheduledStartTime || defaultTime || "")
                setSelectedTagId(task.tagId || null)
                setIsRepeat(false)
            } else {
                // Creating new
                setTitle("")
                setNotes("")
                setEstimatedMinutes(60)
                setScheduledDate(defaultDate || "")
                setScheduledStartTime(defaultTime || "")
                setSelectedTagId(null)
                setIsRepeat(defaultRecurring || false)
                setFrequency("weekly")
                setDaysOfWeek([])
                setDayOfMonth(1)
                setInterval(1)
                setEndDate("")
            }
        }
    }, [isOpen, task, recurringTemplate, defaultDate, defaultTime, defaultRecurring])

    const handlePushToCalendar = async () => {
        if (!task) return
        // If virtual recurring, materialize first
        if (task.isVirtualRecurring && task.templateId && task.recurringDate) {
            const materialized = await materializeRecurringTask(task.templateId, task.recurringDate)
            if (confirm("Push this task to your Google Calendar?")) {
                const loadingToast = toast.loading("Pushing to calendar...")
                const res = await pushTaskToCalendar(materialized.id)
                toast.dismiss(loadingToast)
                if (res.success) {
                    toast.success("Pushed to calendar!")
                } else {
                    toast.error("Failed to push: " + (res.error || "Unknown error"))
                }
            }
        } else {
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
            if (isRepeat) {
                // Recurring task
                const recurringData = {
                    title,
                    notes,
                    estimatedMinutes,
                    scheduledStartTime,
                    frequency,
                    daysOfWeek: frequency === 'weekly' ? daysOfWeek.join(',') : null,
                    dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
                    interval,
                    startDate: scheduledDate,
                    endDate: endDate || null,
                    tagId: selectedTagId,
                }

                if (isEditingTemplate && recurringTemplate) {
                    await updateRecurringTask(recurringTemplate.id, recurringData)
                } else {
                    await createRecurringTask(recurringData)
                }
            } else {
                // Regular task
                const payload = {
                    title,
                    notes,
                    estimatedMinutes,
                    scheduledDate: scheduledStartTime ? (scheduledDate || null) : null,
                    scheduledStartTime: scheduledStartTime || null,
                    tagId: selectedTagId
                }

                if (task) {
                    await updateTask(task.id, payload)
                } else {
                    await createTask(payload)
                }
            }
            setIsOpen(false)
        } catch (error) {
            console.error(error)
            toast.error("Failed to save task")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (isEditingTemplate && recurringTemplate) {
            if (confirm("Delete this recurring task? All future occurrences will be removed. Past completed occurrences will remain.")) {
                await deleteRecurringTask(recurringTemplate.id)
                setIsOpen(false)
                toast.success("Recurring task deleted")
            }
        } else if (task) {
            if (confirm("Are you sure you want to delete this task?")) {
                await deleteTask(task.id)
                setIsOpen(false)
                toast.success("Task deleted")
            }
        }
    }

    const toggleDayOfWeek = (day: number) => {
        setDaysOfWeek(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        )
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    const dialogTitle = isEditingTemplate
        ? "Edit Recurring Task"
        : isRepeat
            ? "Create Recurring Task"
            : task
                ? "Edit Task"
                : "Create Task"

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Add Task</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus={!task && !recurringTemplate} />
                    </div>

                    {/* Date/Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">{isRepeat ? "Start Date" : "Date"}</Label>
                            <Input
                                type="date"
                                id="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                required={isRepeat}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <Input
                                type="time"
                                id="time"
                                value={scheduledStartTime}
                                onChange={(e) => setScheduledStartTime(e.target.value)}
                                required={isRepeat}
                            />
                        </div>
                    </div>

                    {/* Repeat Toggle */}
                    {!task && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsRepeat(!isRepeat)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                                    isRepeat
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                }`}
                            >
                                <Repeat className="h-3.5 w-3.5" />
                                Repeat
                            </button>
                        </div>
                    )}

                    {/* Show repeat toggle as enabled but not editable for editing templates */}
                    {isEditingTemplate && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border bg-primary text-primary-foreground border-primary">
                                <Repeat className="h-3.5 w-3.5" />
                                Repeat
                            </div>
                        </div>
                    )}

                    {/* Recurrence Fields */}
                    {isRepeat && (
                        <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Frequency</Label>
                                    <Select value={frequency} onValueChange={setFrequency}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Every</Label>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            value={interval}
                                            onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                                            min={1}
                                            className="h-8 text-xs w-16"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {frequency === 'daily' ? 'day(s)' : frequency === 'weekly' ? 'week(s)' : 'month(s)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Day of week selector for weekly */}
                            {frequency === 'weekly' && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Days</Label>
                                    <div className="flex gap-1">
                                        {DAY_LABELS.map((label, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => toggleDayOfWeek(idx)}
                                                className={`w-9 h-8 rounded text-xs font-medium transition-colors ${
                                                    daysOfWeek.includes(idx)
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-background border border-border text-muted-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Day of month for monthly */}
                            {frequency === 'monthly' && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Day of month</Label>
                                    <Input
                                        type="number"
                                        value={dayOfMonth}
                                        onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                                        min={1}
                                        max={31}
                                        className="h-8 text-xs w-20"
                                    />
                                </div>
                            )}

                            {/* End date */}
                            <div className="space-y-1">
                                <Label className="text-xs">End Date (optional)</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    )}

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
                                        color: selectedTagId === tag.id ? '#fff' : undefined
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
                        {(task || isEditingTemplate) && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={handleDelete}
                                title={isEditingTemplate ? "Delete Recurring Task" : "Delete Task"}
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
                                {isEditingTemplate ? "Save Series" : task ? "Save Changes" : isRepeat ? "Create Recurring" : "Create Task"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
