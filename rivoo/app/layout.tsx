import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SmoothScrollProvider from "./components/SmoothScrollProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RIVO — Ride Beyond The Road",
  description:
    "The futuristic motorcycle riding platform. Your crew, your route, your ride — every ride connected.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
