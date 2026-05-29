import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { RouteAccentBar } from "@/components/layout/route-accent";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { HelpWidget } from "@/components/support/help-widget";
import { AnnouncementBanner } from "@/components/ui/announcement-banner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Mosaic", template: "%s · Mosaic" },
  description: "Many small pieces forming a whole life picture.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF9EE" },
    { media: "(prefers-color-scheme: dark)", color: "#06131D" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="flex flex-col md:flex-row min-h-screen">
            <Nav />
            <main className="flex-1 pb-4 md:pb-0 overflow-y-auto min-h-screen flex flex-col">
              <RouteAccentBar />
              <AnnouncementBanner />
              <div className="flex-1">{children}</div>
            </main>
          </div>
          <HelpWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
