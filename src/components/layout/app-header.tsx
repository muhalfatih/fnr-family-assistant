"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { Activity, Bot, LogOut, ShieldCheck, Smartphone, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ApiStatusModal } from "@/components/dashboard/api-status-modal";
import { ApiKeysModal } from "@/components/settings/api-keys-modal";
import { triggerPwaInstall } from "@/components/pwa/install-pwa-prompt";
import { useCurrentUser } from "@/lib/hooks/use-family-data";

const pageTitleMap: Record<string, { title: string; category: string }> = {
  "/": { title: "Keuangan & Arus Kas", category: "Ringkasan" },
  "/assets": { title: "Aset & Hutang", category: "Portofolio" },
  "/vault": { title: "Brankas Dokumen", category: "Arsip" },
  "/family": { title: "Anggota Keluarga", category: "Profil" },
  "/logs": { title: "Log Aktivitas & Bot", category: "Monitoring" },
};

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isApiModalOpen, setIsApiModalOpen] = React.useState(false);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = React.useState(false);
  const { user, roleLabel, isAdmin } = useCurrentUser();

  const avatarInitials = React.useMemo(() => {
    const name = user?.name || "Ayah";
    if (
      name.toLowerCase().includes("ibu") ||
      name.toLowerCase().includes("bunda") ||
      name.toLowerCase().includes("rania")
    )
      return "IB";
    if (
      name.toLowerCase().includes("ayah") ||
      name.toLowerCase().includes("fatih")
    )
      return "AY";
    if (
      name.toLowerCase().includes("kakak") ||
      name.toLowerCase().includes("zaid")
    )
      return "ZK";
    if (
      name.toLowerCase().includes("adik") ||
      name.toLowerCase().includes("maryam")
    )
      return "MY";
    return name.substring(0, 2).toUpperCase();
  }, [user?.name]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("fnr_user");
    toast.success("Anda telah berhasil keluar.");
    router.replace("/login");
    router.refresh();
  };

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
          {/* Direct Header Button for Kunci API */}
          <Badge
            variant="outline"
            onClick={() => setIsApiKeysModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-foreground font-medium cursor-pointer bg-background hover:bg-amber-500/10 border-amber-500/40 hover:border-amber-500 transition-colors select-none h-7 px-2.5 shadow-xs"
            title="Kelola Kunci API & Kredensial Sistem (Terenkripsi)"
          >
            <KeyRound className="size-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span>Kunci API</span>
          </Badge>

          <Badge
            variant="outline"
            onClick={() => setIsApiModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted/80 hover:text-foreground transition-colors select-none h-7 px-2.5"
            title="Klik untuk melihat status koneksi API"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <Bot className="size-3.5 text-muted-foreground" />
            <span>Status API</span>
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
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {user?.name || "Anggota Keluarga"}
                    </p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                      {roleLabel}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || "keluarga@keluarga.hub"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsApiKeysModalOpen(true)}
                className="gap-2 cursor-pointer text-xs font-semibold text-foreground hover:bg-amber-500/10 focus:bg-amber-500/10"
              >
                <KeyRound className="size-3.5 text-amber-500" />
                <span>Kunci API & Kredensial</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsApiModalOpen(true)} className="gap-2 cursor-pointer text-xs">
                <Activity className="size-3.5 text-primary" />
                <span>Status Koneksi & AI</span>
              </DropdownMenuItem>
              <Link href="/family">
                <DropdownMenuItem className="cursor-pointer text-xs">Profil & Roster Keluarga</DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={triggerPwaInstall} className="gap-2 cursor-pointer text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Smartphone className="size-3.5" />
                <span>Pasang Aplikasi (PWA)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 font-medium text-xs"
              >
                <LogOut className="size-3.5 text-destructive" aria-hidden="true" />
                <span>Keluar (Logout)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        onOpenApiKeysModal={() => setIsApiKeysModalOpen(true)}
      />

      <ApiKeysModal
        isOpen={isApiKeysModalOpen}
        onClose={() => setIsApiKeysModalOpen(false)}
      />
    </>
  );
}
