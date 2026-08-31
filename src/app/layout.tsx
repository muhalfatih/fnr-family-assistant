import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "F&R Family Hub — Smart Family Assistant",
  description: "Aplikasi manajemen finansial, aset, dan brankas keluarga terpadu bertenaga AI Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={jakartaSans.variable}>
      <body className="min-h-screen bg-slate-50/70 font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
