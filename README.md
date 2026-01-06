# Tenet

**Tenet** is a modern, minimal daily planner and timeboxing application designed to help you organize your day with intention. Combining the power of a to-do list with a calendar view, Tenet allows you to schedule tasks, manage your time effectively, and sync seamlessly with Google Calendar.

![Tenet App Screenshot](/screenshot.png)

> **⚠️ Disclaimer**: This application has been "vibe coded" using **AntiGravity**. Code quality may be sub-optimal, but the vibes are immaculate. Use at your own risk.

## ✨ Features

*   **Modern Branding**: A fresh, clock-meets-grid identity for the timeboxing pro.
*   **Installable PWA**: Install Tenet as a standalone app on iOS, Android, or Desktop.
*   **Native Reminders**: Get browser notifications for upcoming tasks and calendar events.
*   **Google Calendar Sync**: View events alongside tasks and push tasks to your calendar with one click.
*   **Persistent Backlog**: Unscheduled tasks stay in your global sidebar across all days until you box them.
*   **Drag & Drop Scheduling**: Effortlessly plan your day on a vertical time grid.
*   **Dark Mode**: A beautiful, system-aware premium dark theme.
*   **Privacy Focused**: Your data lives locally on your machine (via SQLite).

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

## 📱 Progressive Web App (PWA)

Tenet is fully installable! 

- **iOS/Safari**: Tap Share -> "Add to Home Screen"
- **Android/Chrome**: Tap the three dots -> "Install App"
- **Desktop**: Click the "Install" icon in the address bar.

## 🔔 Browser Notifications

Tenet includes a native Web Push engine. To enable reminders:

1. Generate VAPID keys: `npx web-push generate-vapid-keys --json`
2. Add the keys and `ENABLE_NOTIFICATIONS=true` to your `.env`.
3. Set up a Cron job to trigger the notification check every 5 minutes:
   ```bash
   */5 * * * * curl -X GET "https://your-tenet-url.com/api/notifications/check" -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

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
