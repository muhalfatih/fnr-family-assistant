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
  Smartphone,
} from "lucide-react";
import { triggerPwaInstall } from "@/components/pwa/install-pwa-prompt";

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
import { useCurrentUser } from "@/lib/hooks/use-family-data";

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
  const { canAccessAssets, canAccessVault, canAccessFamily, canAccessLogs, roleLabel, user } = useCurrentUser();

  const filteredNavigationItems = navigationItems.filter((item) => {
    if (item.url === "/assets") return canAccessAssets;
    if (item.url === "/vault") return canAccessVault;
    if (item.url === "/family") return canAccessFamily;
    return true;
  });

  const filteredSystemItems = systemItems.filter((item) => {
    if (item.url === "/logs") return canAccessLogs;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-border/70">
      <SidebarHeader className="border-b border-border/50 pb-3 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <SidebarMenu className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          <SidebarMenuItem className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
            >
              <Link
                href="/"
                className="flex items-center gap-1.5 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-6 shrink-0" strokeWidth={2.1} aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-0.5 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold text-xs text-foreground tracking-tight flex items-center gap-1.5">
                    F&R Family Hub
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 tabular-nums">
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
              {filteredNavigationItems.map((item) => {
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
              {filteredSystemItems.map((item) => {
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={triggerPwaInstall}
                  tooltip="Pasang di HP (PWA)"
                  className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <Smartphone className="size-4 text-muted-foreground" />
                  <span className="text-xs">Pasang di HP (PWA)</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2.5">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden min-w-0">
            <Avatar className="size-7 rounded-md border border-border shrink-0">
              <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground rounded-md">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : "FN"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left leading-none min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">{user?.name || "Keluarga Inti"}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                <span className="truncate">{roleLabel}</span>
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
