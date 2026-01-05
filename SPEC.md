# Timeboxer - Daily Planner App

## Product Overview

A minimal, self-hosted daily planner for timeboxing. Users create tasks, assign them to specific time slots in their day, and see their Google Calendar events alongside to avoid double-booking.

**Core philosophy:** One day at a time. Simple. Fast. Mobile-first.

---

## User Stories

1. As a user, I can see today's schedule as a vertical time grid (6am - 10pm)
2. As a user, I can create a task with a title and optional notes
3. As a user, I can drag a task onto a time slot to schedule it
4. As a user, I can resize a scheduled task to change its duration
5. As a user, I can see my Google Calendar events (read-only) on the same grid
6. As a user, I can mark a task as complete
7. As a user, I can navigate to tomorrow/yesterday
8. As a user, I can see unscheduled tasks in a sidebar/drawer
9. As a user, I can access the app from mobile and desktop

---

## Features

### MVP (v0.1)

- [ ] Daily time grid view (vertical, 30-min slots)
- [ ] Task creation (title, notes, estimated duration)
- [ ] Drag task to time slot to schedule
- [ ] Resize scheduled task to adjust duration
- [ ] Google Calendar events overlay (read-only, different color)
- [ ] Unscheduled tasks list (sidebar on desktop, drawer on mobile)
- [ ] Mark task complete (strikethrough, stays visible)
- [ ] Date navigation (today, prev, next)
- [ ] Mobile responsive layout

### Future (v0.2+)

- [ ] Recurring tasks
- [ ] Task categories/tags with colors
- [ ] Week view
- [ ] Time tracking (actual vs planned)
- [ ] Task rollover (unfinished tasks move to next day)
- [ ] Pomodoro timer integration

---

## Data Model

### Task

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| title | string | Required, max 200 chars |
| notes | text | Optional |
| estimatedMinutes | int | Default 30, increments of 15 |
| scheduledDate | date | Nullable - null means unscheduled |
| scheduledStartTime | time | Nullable - null means unscheduled |
| isCompleted | boolean | Default false |
| completedAt | timestamp | Nullable |
| createdAt | timestamp | Auto |
| updatedAt | timestamp | Auto |

### Notes on data model

- No separate "event" table - Google Calendar events are fetched live, not stored
- Single user app for MVP - no user table needed if running personal instance
- SQLite is fine for personal use; Postgres if expecting multiple users later

---

## UI/UX Specification

### Layout

```
┌─────────────────────────────────────────────────┐
│  [<] Today, Mon Jan 6 [>]           [+ Add Task]│
├─────────────────────────────────────────────────┤
│                                                 │
│  UNSCHEDULED (collapsible on mobile)            │
│  ┌─────────────────────────────────┐            │
│  │ □ Write proposal (45m)          │            │
│  │ □ Review PR (30m)               │            │
│  └─────────────────────────────────┘            │
│                                                 │
├─────────────────────────────────────────────────┤
│  TIME GRID                                      │
│                                                 │
│  6:00  ─────────────────────────────            │
│  6:30  ─────────────────────────────            │
│  7:00  ─────────────────────────────            │
│  ...                                            │
│  9:00  ┌─────────────────────────┐              │
│        │ ░░ Team standup ░░░░░░░ │ ← GCal      │
│  9:30  └─────────────────────────┘              │
│ 10:00  ┌─────────────────────────┐              │
│        │ ■ Write proposal        │ ← Task      │
│ 10:30  │                         │              │
│ 10:45  └─────────────────────────┘              │
│ 11:00  ─────────────────────────────            │
│  ...                                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Visual Design

- Clean, minimal - no clutter
- Google Calendar events: muted/gray background, not interactive
- Tasks: solid color background, draggable, resizable
- Completed tasks: strikethrough text, reduced opacity
- Current time: horizontal red line indicator
- Time slots: subtle grid lines, 30-min increments
- Dark mode support (optional for MVP)

### Mobile Behavior

- Unscheduled tasks in bottom drawer (swipe up to reveal)
- Time grid takes full width
- Tap task to edit (modal)
- Long press + drag to reschedule
- Minimum touch target: 44px

### Interactions

| Action | Desktop | Mobile |
|--------|---------|--------|
| Create task | Click "+ Add Task" button | Same |
| Schedule task | Drag from unscheduled to grid | Long press + drag |
| Reschedule | Drag on grid | Long press + drag |
| Change duration | Drag bottom edge to resize | Drag handle or edit modal |
| Edit task | Click to open inline edit | Tap to open modal |
| Complete task | Click checkbox | Tap checkbox |
| Delete task | Click delete icon (hover) | Swipe left or edit modal |

---

## Tech Stack

### Recommended

- **Framework:** Next.js 14+ (App Router)
- **Database:** SQLite via Prisma (simple) or Postgres
- **UI Components:** shadcn/ui (for buttons, inputs, modals)
- **Calendar Grid:** Build custom with CSS Grid or use @dnd-kit for drag/drop
- **Styling:** Tailwind CSS
- **Google Calendar:** Google Calendar API v3 (REST)

### Why not FullCalendar?

- Overkill for daily view only
- Harder to customize styling
- Large bundle size
- Custom grid is ~200 lines of code for this use case

### Alternative simple libraries

- **@dnd-kit/core** - for drag and drop
- **date-fns** - for date manipulation
- **react-resizable** - for task resize handles (optional)

---

## API Endpoints

### Tasks

```
GET    /api/tasks?date=2025-01-06     # Get tasks for date (scheduled + unscheduled)
POST   /api/tasks                      # Create task
PATCH  /api/tasks/:id                  # Update task (schedule, complete, edit)
DELETE /api/tasks/:id                  # Delete task
```

### Google Calendar

```
GET    /api/calendar?date=2025-01-06   # Get Google Calendar events for date
```

### Request/Response Examples

**Create Task**
```json
POST /api/tasks
{
  "title": "Write proposal",
  "notes": "Focus on pricing section",
  "estimatedMinutes": 45
}
```

**Schedule Task**
```json
PATCH /api/tasks/:id
{
  "scheduledDate": "2025-01-06",
  "scheduledStartTime": "10:00"
}
```

**Complete Task**
```json
PATCH /api/tasks/:id
{
  "isCompleted": true
}
```

---

## Google Calendar Integration

### Scope Required

```
https://www.googleapis.com/auth/calendar.readonly
```

### Fetch Events

Use Google Calendar API to fetch events for the displayed date:

```
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
  ?timeMin=2025-01-06T00:00:00Z
  &timeMax=2025-01-07T00:00:00Z
  &singleEvents=true
  &orderBy=startTime
```

### Token Handling

- Assume auth token is provided via environment variable or existing auth system
- Refresh token handling out of scope for MVP (manual refresh acceptable)

### Display

- Show event title and time only
- Use muted visual style (gray/translucent)
- Not interactive (no click, no drag)
- All-day events shown at top or excluded

---

## File Structure (Suggested)

```
/app
  /api
    /tasks
      route.ts          # GET all, POST create
      /[id]
        route.ts        # PATCH, DELETE
    /calendar
      route.ts          # GET google calendar events
  /page.tsx             # Main daily view
  /layout.tsx
  /globals.css

/components
  /time-grid.tsx        # The vertical time grid
  /task-block.tsx       # A scheduled task on the grid
  /gcal-event.tsx       # A google calendar event (read-only)
  /task-list.tsx        # Unscheduled tasks sidebar/drawer
  /task-form.tsx        # Create/edit task modal
  /date-nav.tsx         # Date navigation header

/lib
  /db.ts                # Prisma client
  /google-calendar.ts   # Google Calendar API wrapper

/prisma
  schema.prisma
```

---

## Environment Variables

```
DATABASE_URL=file:./dev.db          # SQLite path or Postgres connection string
GOOGLE_ACCESS_TOKEN=xxx             # Google OAuth access token
GOOGLE_REFRESH_TOKEN=xxx            # Optional for auto-refresh
GOOGLE_CLIENT_ID=xxx                # For token refresh
GOOGLE_CLIENT_SECRET=xxx            # For token refresh
```

---

## Deployment

### Local (Pi)

```bash
docker build -t timeboxer .
docker run -p 3000:3000 -v ./data:/app/data timeboxer
```

### Coolify

- Standard Next.js deployment
- Add Postgres service if not using SQLite
- Set environment variables in Coolify UI

---

## Success Criteria (MVP)

1. User can create a task in under 3 seconds
2. User can schedule a task by dragging in under 2 seconds
3. Google Calendar events appear within 1 second of page load
4. Works on mobile Safari and Chrome
5. Total bundle size under 200KB (gzipped)
6. Page load under 2 seconds on 4G

---

## Out of Scope for MVP

- User authentication/multi-user
- Offline support
- Push notifications
- Recurring tasks
- Week/month views
- Task sharing
- Time tracking
- Integrations (Jira, GitHub, etc.)

---

## Open Questions

1. Should unscheduled tasks persist indefinitely or auto-archive after X days?
2. Show tasks from previous days that weren't completed?
3. Time grid hours configurable (6am-10pm vs 24hr)?
4. Support multiple Google Calendars or just primary?

---

## References

- Google Calendar API: https://developers.google.com/calendar/api/v3/reference
- shadcn/ui: https://ui.shadcn.com/
- @dnd-kit: https://dndkit.com/
- Prisma: https://www.prisma.io/docs