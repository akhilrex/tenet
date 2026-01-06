import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { NotificationManager } from "@/components/notification-manager"
import { TopProgressBar } from "@/components/top-progress-bar"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tenet",
  description: "Minimal Daily Planner",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tenet",
  },
  icons: {
    icon: "/tenet_logo_v2.png",
    apple: "/tenet_logo_v2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased text-foreground")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopProgressBar />
          {children}
          <NotificationManager />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
