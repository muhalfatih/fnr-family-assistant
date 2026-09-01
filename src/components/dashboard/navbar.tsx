"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiStatusModal } from "@/components/dashboard/api-status-modal";

interface NavbarProps {
  familyName?: string;
}

export function Navbar({ familyName = "Keluarga F&R" }: NavbarProps) {
  const pathname = usePathname();
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Keuangan" },
    { href: "/assets", label: "Aset & Hutang" },
    { href: "/vault", label: "Brankas Dokumen" },
    { href: "/family", label: "Keluarga" },
    { href: "/logs", label: "Log Aktivitas" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto justify-between gap-4">
          {/* Left: Brand Switcher & Main Nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                FR
              </div>
              <span className="font-semibold text-sm leading-tight text-foreground truncate">
                {familyName}
              </span>
            </Link>

            <div className="hidden md:block h-4 w-px bg-border" />

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Status & Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant="outline"
              onClick={() => setIsApiModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-normal cursor-pointer hover:bg-muted transition-colors select-none"
              title="Klik untuk melihat diagnostik koneksi API"
            >
              <Bot className="size-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>Status API & Bot</span>
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-8 rounded-full p-0">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                      AY
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Ayah (Admin)</p>
                    <p className="text-xs leading-none text-muted-foreground">ayah@keluarga.hub</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsApiModalOpen(true)} className="gap-2 cursor-pointer">
                  <Activity className="size-4 text-primary" aria-hidden="true" />
                  <span>Cek Koneksi API & Layanan</span>
                </DropdownMenuItem>
                <Link href="/family">
                  <DropdownMenuItem className="cursor-pointer">Profil & Anggota Keluarga</DropdownMenuItem>
                </Link>
                <DropdownMenuItem>Pengaturan Bot & Webhook</DropdownMenuItem>
                <DropdownMenuItem>Integrasi Google Drive & Sheets</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* API Diagnostics Modal */}
      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />
    </>
  );
}
