import { getTasks, getGoogleCalendarEvents, getRecurringTasksForDate } from "@/app/actions"
import { DateNavClient } from "@/components/date-nav-client"
import { TaskForm } from "@/components/task-form"
import { Planner } from "@/components/planner"

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams
  let dateStr = params.date

  if (!dateStr) {
    const now = new Date()
    // Local YYYY-MM-DD
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    dateStr = `${y}-${m}-${d}`
  }

  // Date constructor from "YYYY-MM-DD" is UTC, but new Date() is local.
  // We handle dateStr consistently as YYYY-MM-DD.
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  const tasks = await getTasks(dateStr)
  const recurringTasks = await getRecurringTasksForDate(dateStr)
  // Calendar events fetching might fail if token is missing, handled in action
  const events = await getGoogleCalendarEvents(dateStr)

  return (
    <main className="container mx-auto p-4 max-w-7xl h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <DateNavClient dateStr={dateStr} />
        <div className="hidden md:block">
          <TaskForm defaultDate={dateStr} />
        </div>
      </div>

      <Planner tasks={tasks} recurringTasks={recurringTasks} date={date} calendarEvents={events} />
    </main>
  )
}
