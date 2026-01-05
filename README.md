# Tenet

**Tenet** is a modern, minimal daily planner and timeboxing application designed to help you organize your day with intention. Combining the power of a to-do list with a calendar view, Tenet allows you to schedule tasks, manage your time effectively, and sync seamlessly with Google Calendar.

![Tenet App Screenshot](/screenshot.png)

> **⚠️ Disclaimer**: This application has been "vibe coded" using **AntiGravity**. Code quality may be sub-optimal, but the vibes are immaculate. Use at your own risk.

## ✨ Features

*   **Timeboxing Interface**: visually plan your day by dragging tasks onto a timeline.
*   **Google Calendar Sync**: Two-way synchronization. View your events alongside your tasks and push tasks to your calendar with a single click.
*   **Drag & Drop Scheduling**: Effortlessly rearrange your schedule.
*   **Task Management**: Create tasks with titles, notes, estimated durations, and tags.
*   **Smart Tagging**: Color-coded tags to categorize your work (e.g., Work, Personal, Deep Work).
*   **Dark Mode**: A beautiful, system-aware dark theme for focused night sessions.
*   **Mobile Friendly**: Responsive design with a dedicated mobile drawer for unscheduled tasks.
*   **Privacy Focused**: Your data lives locally on your machine (via SQLite) and connects directly to your Google services.

## 🛠️ Tech Stack

Built with the latest modern web technologies for performance and developer experience:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
*   **Language**: TypeScript
*   **Database**: SQLite with [Prisma ORM](https://www.prisma.io/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
*   **Icons**: Lucide React
*   **DnD**: @dnd-kit

## 🐳 Self-Hosting (Docker)

Tenet is designed to be easily self-hosted. The simplest way to get up and running is with Docker Compose.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/akhilrex/tenet.git
    cd tenet
    ```

2.  **Configure Environment**
    Create a `.env` file with your preferences.
    ```bash
    cp .env.example .env
    ```
    *   `DATABASE_URL`: `"file:./dev.db"` (default SQLite)
    *   **(Optional) Google Calendar Sync**:
        *   Obtain OAuth credentials (Client ID, Secret, Refresh Token) from Google Cloud Console.
        *   Add them to `.env`. See `GOOGLE_CALENDAR_SETUP.md` for details.

3.  **Start the Container**
    ```bash
    docker-compose up -d
    ```
    Your instance will be available at `http://localhost:3000`.

    > **Troubleshooting Permissions**: If you see "Unable to open database file" or "/app/db is not writable" (common on Linux/Pi), run this on your host to fix ownership:
    > ```bash
    > sudo chown -R 1001:1001 ./data
    > ```

    > **Note on Persistence**: By default, the SQLite database is stored in the `./data` folder. This is mounted to `/app/db` inside the container.

## 🛠️ Local Development

If you want to contribute or modify the code, here's how to run it locally without Docker.

### Prerequisites
*   Node.js 18+ (tested with v20)
*   npm or pnpm

### Setup
1.  **Install dependencies**: `npm install`
2.  **Initialize Database**: `npx prisma generate && npx prisma db push`
3.  **Run Dev Server**: `npm run dev`

    Access the app at `http://localhost:3000`.

## 🤝 Contributing
Contributions are welcome! Whether it's reporting a bug, suggesting a feature, or writing code, we appreciate your help in making Tenet better.

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Created by [Akhil Gupta](https://github.com/akhilrex).

<a href="https://www.buymeacoffee.com/akhilrex" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
