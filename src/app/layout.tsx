import type { Metadata, Viewport } from "next";
import "98.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retro Web Inc",
};

export const viewport: Viewport = {
  themeColor: "#008080",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
