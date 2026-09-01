"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  Building2,
  FolderLock,
  Users,
  TerminalSquare,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Bot,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Keuangan",
    url: "/",
    icon: Wallet,
    description: "Arus kas, transaksi & anggaran",
  },
  {
    title: "Aset & Hutang",
    url: "/assets",
    icon: Building2,
    description: "Neraca kekayaan & amortisasi",
  },
  {
    title: "Brankas Dokumen",
    url: "/vault",
    icon: FolderLock,
    description: "Arsip berkas & reminder jatuh tempo",
  },
  {
    title: "Anggota Keluarga",
    url: "/family",
    icon: Users,
    description: "Roster profil & analitik belanja",
  },
];

const systemItems = [
  {
    title: "Log & Bot AI",
    url: "/logs",
    icon: TerminalSquare,
    description: "Monitor aktivitas Telegram/Gemini",
  },
];

export function AppSidebar({
  onAddTransaction,
}: {
  onAddTransaction?: () => void;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/70">
      <SidebarHeader className="border-b border-border/50 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs shadow-sm">
                  FR
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-xs text-foreground tracking-tight flex items-center gap-1.5">
                    F&R Family Hub
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono">
                      v2.0
                    </Badge>
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    Executive Ledger
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {onAddTransaction && (
          <div className="pt-2 group-data-[collapsible=icon]:hidden">
            <Button
              onClick={onAddTransaction}
              size="sm"
              className="w-full h-8 text-xs font-medium justify-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="size-3.5" />
              <span>Catat Transaksi</span>
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}
                    >
                      <Link href={item.url} className="flex items-center gap-2.5">
                        <item.icon className={`size-4 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                        <span className="text-xs">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-1" />

        <SidebarGroup>
          <SidebarGroupLabel>Sistem & AI</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}
                    >
                      <Link href={item.url} className="flex items-center gap-2.5">
                        <item.icon className={`size-4 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                        <span className="text-xs">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2.5">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Avatar className="size-7 rounded-md border border-border">
              <AvatarFallback className="text-[11px] font-bold bg-muted text-muted-foreground rounded-md">
                FN
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-semibold text-foreground truncate">Keluarga Inti</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                Online
              </span>
            </div>
          </div>
          <ThemeToggle compact />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
