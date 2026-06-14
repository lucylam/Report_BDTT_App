import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PwaRuntime } from "@/components/PwaRuntime";
import { getInitialTheme } from "@/lib/theme.server";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-plus-jakarta",
  display: "swap"
});

export const metadata: Metadata = {
  applicationName: "BDTT 2026",
  title: "Tiến độ BDTT 2026",
  description: "Theo dõi tiến độ BDTT 2026 nội bộ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BDTT 2026"
  },
  icons: {
    icon: [
      { url: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/app-icon.svg", type: "image/svg+xml" },
      { url: "/icons/app-icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/app-icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6fa51f"
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
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
