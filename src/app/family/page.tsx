"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MemberCard } from "@/components/family/member-card";
import { ContributionCharts } from "@/components/family/contribution-charts";
import { AddMemberModal } from "@/components/family/add-member-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, RefreshCw, Send, ShieldCheck, CreditCard } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  useFamilyMembers,
  useWallets,
  useFamilyContributions,
} from "@/lib/hooks/use-family-data";

export default function FamilyPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any | null>(null);

  // SWR Caching & Real-time Auto-sync Hooks
  const { members, isLoading: isLoadingMembers, isValidating: isValidatingMembers, mutate: mutateMembers } = useFamilyMembers();
  const { wallets, mutate: mutateWallets } = useWallets();
  const {
    contributions,
    totalExpense,
    unassigned,
    isLoading: isLoadingContributions,
    mutate: mutateContributions,
  } = useFamilyContributions();

  const refreshAll = () => {
    mutateMembers();
    mutateWallets();
    mutateContributions();
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus profil anggota keluarga ini?")) return;
    try {
      const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        refreshAll();
      }
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  const handleEditMember = (member: any) => {
    setMemberToEdit(member);
    setIsAddModalOpen(true);
  };

  const connectedTelegram = members.filter((m) => Boolean(m.telegram_chat_id)).length;
  const isInitialLoading = isLoadingMembers && members.length === 0;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <Users className="size-5 sm:size-6 text-foreground shrink-0" aria-hidden="true" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                Anggota Keluarga & Kontribusi
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Kelola profil anggota keluarga, tautan akun bot Telegram, dan pantau kontribusi belanja bulanan.
              </p>
              {isValidatingMembers && !isLoadingMembers && (
                <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sync</span>
                </span>
              )}
            </div>
          </div>

          {/* Structured Responsive Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="h-8 text-xs px-2.5 rounded-md shrink-0"
              title="Segarkan data sekarang"
            >
              <RefreshCw className={`size-3.5 ${isValidatingMembers ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setMemberToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="h-8 text-xs px-3 rounded-md shadow-sm shrink-0 whitespace-nowrap gap-1.5 flex-1 sm:flex-initial"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah Anggota</span>
            </Button>
          </div>
        </div>

        {/* Integrated Quick Info Strip (Clean, Calm & Non-Redundant) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card/60 text-card-foreground">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
            <div>
              <p className="text-xs text-muted-foreground">Total Pengeluaran Keluarga</p>
              <p className="text-base sm:text-xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">
                {formatRupiah(totalExpense)}
              </p>
            </div>
            <div className="h-8 w-px bg-border/60 hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">Anggota Terdaftar</p>
              <p className="text-base sm:text-xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">
                {members.length} <span className="text-xs font-normal text-muted-foreground">Orang</span>
              </p>
            </div>
            <div className="h-8 w-px bg-border/60 hidden md:block" />
            <div className="hidden md:block">
              <p className="text-xs text-muted-foreground">Terhubung ke Telegram</p>
              <p className="text-base sm:text-xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {connectedTelegram} <span className="text-xs font-normal text-muted-foreground">/ {members.length}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground tabular-nums self-start sm:self-auto">
            Bulan: <span className="font-semibold text-foreground">September 2026</span>
          </div>
        </div>

        {/* 2-Column Split Section: Contribution Breakdown (4 Cols) & Member Roster (3 Cols) */}
        <div className="grid gap-6 lg:grid-cols-7 items-start">
          {/* Left: Spending Contribution Charts (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Proporsi & Analisis Belanja
                </h2>
                <p className="text-xs text-muted-foreground">
                  Distribusi kontribusi pengeluaran antar-anggota keluarga periode ini.
                </p>
              </div>
            </div>

            {isInitialLoading ? (
              <Skeleton className="h-[360px] rounded-xl" />
            ) : (
              <ContributionCharts
                contributions={contributions}
                unassigned={unassigned}
                totalExpense={totalExpense}
              />
            )}
          </div>

          {/* Right: Member Profiles Grid (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Daftar Profil Anggota ({members.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tautan dompet & status bot Telegram per anggota.
                </p>
              </div>
            </div>

            {isInitialLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[160px] rounded-xl" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl border border-dashed text-muted-foreground">
                <Users className="size-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-xs font-semibold text-foreground">Belum Ada Anggota</p>
                <p className="text-[11px] mt-1 text-muted-foreground">
                  Tambahkan profil anggota keluarga pertama untuk mulai memantau kontribusi belanja.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-3 text-xs gap-1.5 h-8"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Tambah Anggota Sekarang</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    onEdit={handleEditMember}
                    onDelete={handleDeleteMember}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Anggota */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setMemberToEdit(null);
        }}
        onSuccess={refreshAll}
        memberToEdit={memberToEdit}
        wallets={wallets}
      />
    </AppShell>
  );
}
