"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Activity, Bot, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ApiStatusModal } from "@/components/dashboard/api-status-modal";

const pageTitleMap: Record<string, { title: string; category: string }> = {
  "/": { title: "Keuangan & Arus Kas", category: "Ringkasan" },
  "/assets": { title: "Aset & Hutang", category: "Portofolio" },
  "/vault": { title: "Brankas Dokumen", category: "Arsip" },
  "/family": { title: "Anggota Keluarga", category: "Profil" },
  "/logs": { title: "Log Aktivitas & Bot", category: "Monitoring" },
};

export function AppHeader() {
  const pathname = usePathname();
  const [isApiModalOpen, setIsApiModalOpen] = React.useState(false);

  const currentPage = pageTitleMap[pathname] || {
    title: "Dashboard",
    category: "Menu",
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-3.5 sm:px-4 backdrop-blur-md transition-all">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 size-8 text-foreground shrink-0" />
          <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList className="gap-1 sm:gap-1.5 text-xs flex-nowrap">
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/" className="text-xs text-muted-foreground hover:text-foreground">
                  F&R Hub
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-none">
                  {currentPage.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Badge
            variant="outline"
            onClick={() => setIsApiModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/80 hover:text-foreground transition-colors select-none h-7 px-2.5"
            title="Klik untuk melihat status koneksi API"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <Bot className="size-3.5 text-muted-foreground" />
            <span>API Status</span>
          </Badge>

          <ThemeToggle compact />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full p-0 shrink-0 aspect-square select-none focus-visible:ring-1"
                aria-label="Menu Akun & Profil"
              >
                <Avatar className="size-8 rounded-full border border-border shrink-0 aspect-square">
                  <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground select-none">
                    AY
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <p className="font-semibold text-xs text-foreground">Ayah (Admin)</p>
                  <p className="text-[11px] text-muted-foreground">ayah@keluarga.hub</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsApiModalOpen(true)} className="gap-2 cursor-pointer text-xs">
                <Activity className="size-3.5 text-primary" />
                <span>Status Koneksi & AI</span>
              </DropdownMenuItem>
              <Link href="/family">
                <DropdownMenuItem className="cursor-pointer text-xs">Profil & Roster Keluarga</DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="text-xs">Pengaturan Webhook Telegram</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />
    </>
  );
}
