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

The easiest way to run Tenet is using the pre-built Docker image. You don't need to build the code manually.

### Method 1: Docker Compose (Recommended)

1.  **Prepare your directory**
    Create a folder for your data to ensure your tasks and settings persist.
    ```bash
    mkdir tenet && cd tenet
    mkdir data
    ```

2.  **Create a `docker-compose.yml`**
    Save the following content in your `tenet` directory:
    ```yaml
    version: '3.9'
    services:
      app:
        image: ghcr.io/akhilrex/tenet:latest
        container_name: tenet-app
        restart: always
        ports:
          - "3000:3000"
        environment:
          - DATABASE_URL=file:/app/db/prod.db
          # See "Environment Variables" below for more options
        volumes:
          - ./data:/app/db
    ```

3.  **Start the Container**
    ```bash
    docker-compose up -d
    ```
    Your instance will be ready at `http://localhost:3000`.

### Method 2: Docker CLI

If you prefer a single command:

```bash
docker run -d \
  --name tenet \
  -p 3000:3000 \
  -v $(pwd)/data:/app/db \
  -e DATABASE_URL="file:/app/db/prod.db" \
  ghcr.io/akhilrex/tenet:latest
```

> **Troubleshooting Permissions**: If you encounter "Unable to open database file" errors (common on Linux/VPS), ensure the `data` directory is writable by the container user (UID 1001):
> ```bash
> sudo chown -R 1001:1001 ./data
> ```

## 🔑 Environment Variables

Tenet is configured via environment variables. You can set these in your `docker-compose.yml` or a `.env` file. A reference file is available at `[.env.example](.env.example)`.

| Variable | Description | Required | Default / Example |
|----------|-------------|:--------:|-------------------|
| `DATABASE_URL` | Database connection string. | ✅ | `file:/app/db/prod.db` |
| `ENABLE_NOTIFICATIONS`| Enable browser push notifications. | ❌ | `true` |
| `CRON_SECRET` | Secret to secure the notification cron endpoint.| ❌ | Random string |
| `GOOGLE_CLIENT_ID` | OAuth Client ID for Calendar Sync. | ❌ | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| OAuth Client Secret for Calendar Sync. | ❌ | - |
| `GOOGLE_REFRESH_TOKEN`| OAuth Refresh Token for the user. | ❌ | - |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key for Web Push. | ❌ | (Generated via `web-push`) |
| `VAPID_PRIVATE_KEY` | Private key for Web Push. | ❌ | (Generated via `web-push`) |
| `VAPID_EMAIL` | Contact email for the push service. | ❌ | `mailto:admin@example.com` |

**Google Calendar Note**: To sync with Google Calendar, you must set up OAuth credentials securely. See [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md) for detailed instructions.

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
