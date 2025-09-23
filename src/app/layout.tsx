import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth-context";
import AuthPerformanceMonitor from "@/components/AuthPerformanceMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "sayit - 校园社交平台",
  description: "专为大学生打造的校园社交平台，连接校园，分享生活",
  keywords: "校园社交, 大学生, 表白墙, 跳蚤市场, 悬赏任务",
  authors: [{ name: "sayit Team" }],
  creator: "sayit",
  publisher: "sayit",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "sayit - 校园社交平台",
    description: "专为大学生打造的校园社交平台，连接校园，分享生活",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "sayit - 校园社交平台",
    description: "专为大学生打造的校园社交平台，连接校园，分享生活",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Navbar />
          <main>
            {children}
          </main>
          <AuthPerformanceMonitor />
        </AuthProvider>
      </body>
    </html>
  );
}
