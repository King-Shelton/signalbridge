import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://signalbridge-web.onrender.com"),
  title: {
    default: "SignalBridge",
    template: "%s · SignalBridge",
  },
  description:
    "A human-in-the-loop youth support command centre. After-hours care for young people, with consent-based handoffs to the workers who show up for them.",
  applicationName: "SignalBridge",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "SignalBridge",
    description:
      "After-hours support for young people — and a space for the workers who show up for them.",
    siteName: "SignalBridge",
    type: "website",
    locale: "en_SG",
  },
  twitter: {
    card: "summary",
    title: "SignalBridge",
    description:
      "After-hours support for young people — and a space for the workers who show up for them.",
  },
};

export const viewport: Viewport = {
  themeColor: "#060d0c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
