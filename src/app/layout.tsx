import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
