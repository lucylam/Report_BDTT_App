import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { FirstRunOnboarding } from "@/components/FirstRunOnboarding";
import { PwaRuntime } from "@/components/PwaRuntime";
import { getInitialTheme } from "@/lib/theme.server";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-plus-jakarta"
});

export const metadata: Metadata = {
  applicationName: "Cổng vận hành Xưởng Điều khiển",
  title: "Cổng vận hành Xưởng Điều khiển",
  description: "Công tác, nhiệm vụ và báo cáo nội bộ của Xưởng Điều khiển",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Xưởng Điều khiển"
  },
  icons: {
    icon: [
      { url: "/icons/app-icon.svg", type: "image/svg+xml" },
      { url: "/icons/app-icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/app-icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#537f16"
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

const RootLayout = async ({ children }: RootLayoutProps): Promise<React.ReactElement> => {
  const initialTheme = await getInitialTheme();

  return (
    <html
      className={`${plusJakartaSans.variable} ${initialTheme === "dark" ? "dark" : ""}`}
      lang="vi"
      style={{ colorScheme: initialTheme }}
      suppressHydrationWarning
    >
      <body>
        <PwaRuntime />
        <FirstRunOnboarding />
        <a
          className="fixed left-4 top-4 z-[2000] -translate-y-[200%] rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-4 py-3 font-semibold text-[var(--primary-contrast)] transition-transform focus:translate-y-0"
          href="#main-content"
        >
          Bỏ qua đến nội dung chính
        </a>
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
};

export default RootLayout;
