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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ShieldCheck, Smartphone, KeyRound, UserCog, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ApiKeysModal } from "@/components/settings/api-keys-modal";
import { AddMemberModal } from "@/components/family/add-member-modal";
import { triggerPwaInstall } from "@/components/pwa/install-pwa-prompt";
import { useCurrentUser, useFamilyMembers, useWallets } from "@/lib/hooks/use-family-data";
import { cn } from "@/lib/utils";

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
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = React.useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);

  const { user, roleLabel, isAdmin, isSpouse, canAccessFamily, mutate: mutateCurrentUser } = useCurrentUser();
  const { members, mutate: mutateMembers } = useFamilyMembers();
  const { wallets } = useWallets();

  const handleCloseApiKeysModal = React.useCallback(() => {
    setIsApiKeysModalOpen(false);
  }, []);

  const handleCloseEditProfile = React.useCallback(() => {
    setIsEditProfileOpen(false);
  }, []);

  const handleProfileSuccess = React.useCallback(() => {
    mutateMembers();
    mutateCurrentUser();
  }, [mutateMembers, mutateCurrentUser]);

  const currentMember = React.useMemo(() => {
    if (!members || members.length === 0) return null;
    if (user?.id) {
      const found = members.find((m) => m.id === user.id);
      if (found) return found;
    }
    if (user?.name) {
      const found = members.find(
        (m) => m.full_name?.toLowerCase() === user.name?.toLowerCase()
      );
      if (found) return found;
    }
    return null;
  }, [members, user]);

  const memberToEdit = React.useMemo(() => {
    if (currentMember) return currentMember;
    if (!user) return null;
    return {
      id: user.id || "",
      full_name: user.name || "",
      role: user.role || "member",
      whatsapp_number: "",
      telegram_username: "",
      telegram_chat_id: "",
    };
  }, [currentMember, user]);

  const userIdentifier = React.useMemo(() => {
    if (currentMember?.telegram_username) {
      return `@${currentMember.telegram_username.replace(/^@/, "")}`;
    }
    if (currentMember?.whatsapp_number) {
      return currentMember.whatsapp_number;
    }
    if (currentMember?.telegram_chat_id) {
      return `ID Telegram: ${currentMember.telegram_chat_id}`;
    }
    if (user?.email && !user.email.endsWith("@keluarga.hub")) {
      return user.email;
    }
    return "Akun Terdaftar";
  }, [currentMember, user]);

  const avatarInitials = React.useMemo(() => {
    const name = user?.name || currentMember?.full_name || "Ayah";
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
  }, [user?.name, currentMember?.full_name]);

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
          <ThemeToggle compact />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8 rounded-full p-0 shrink-0 aspect-square select-none ring-1 ring-border/60 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
                aria-label="Menu Akun & Profil"
              >
                <Avatar className="size-8 rounded-full shrink-0 aspect-square">
                  <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground select-none">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] p-2 shadow-xl border-border/80 rounded-2xl animate-in fade-in-50 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
            >
              {/* Header Profil Mewah */}
              <div className="p-3 bg-muted/50 rounded-xl border border-border/50 mb-1 space-y-2">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10 rounded-full border-2 border-background shadow-xs shrink-0 mt-0.5">
                    <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground select-none">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="font-semibold text-xs sm:text-sm text-foreground truncate leading-tight">
                        {user?.name || currentMember?.full_name || "Anggota Keluarga"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-medium h-4.5 border",
                          isAdmin
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : isSpouse
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        )}
                      >
                        {roleLabel}
                      </Badge>

                      {currentMember?.has_password ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                          <ShieldCheck className="size-2.5" />
                          <span>Sandi Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          <Lock className="size-2.5" />
                          <span>Tanpa Sandi</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">
                      {userIdentifier}
                    </p>
                  </div>
                </div>
              </div>

              {/* Kelompok Profil & Akun */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Akun & Profil
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsEditProfileOpen(true)}
                  className="gap-2.5 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <UserCog className="size-4 text-primary shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-foreground">Profil & Sandi Saya</span>
                    <span className="text-[10px] text-muted-foreground">Ubah Telegram, WA, atau kata sandi</span>
                  </div>
                </DropdownMenuItem>

                {canAccessFamily && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/family"
                      className="gap-2.5 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer focus:bg-accent focus:text-accent-foreground flex items-center"
                    >
                      <Users className="size-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-foreground">Roster Anggota Keluarga</span>
                        <span className="text-[10px] text-muted-foreground">Kelola anggota & peran keluarga</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1 border-border/50" />

              {/* Kelompok Fitur & Sistem */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Sistem & Akses
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsApiKeysModalOpen(true)}
                  className="gap-2.5 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer focus:bg-amber-500/10 hover:bg-amber-500/5 group"
                >
                  <KeyRound className="size-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Kunci API & Kredensial</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                        Aman
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Gemini, Telegram & Supabase</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={triggerPwaInstall}
                  className="gap-2.5 py-2 px-2.5 rounded-lg text-xs font-medium cursor-pointer focus:bg-emerald-500/10 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                >
                  <Smartphone className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium">Pasang Aplikasi (PWA)</span>
                    <span className="text-[10px] text-muted-foreground">Akses cepat di layar ponsel</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1 border-border/50" />

              {/* Keluar */}
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2.5 py-2 px-2.5 rounded-lg text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                >
                  <LogOut className="size-4 text-destructive shrink-0" />
                  <span className="font-medium">Keluar dari Sesi</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ApiKeysModal
        isOpen={isApiKeysModalOpen}
        onClose={handleCloseApiKeysModal}
      />

      {memberToEdit && (
        <AddMemberModal
          isOpen={isEditProfileOpen}
          onClose={handleCloseEditProfile}
          onSuccess={handleProfileSuccess}
          memberToEdit={memberToEdit}
          wallets={wallets}
        />
      )}
    </>
  );
}
