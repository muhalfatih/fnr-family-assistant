"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { MemberCard } from "@/components/family/member-card";
import { ContributionCharts } from "@/components/family/contribution-charts";
import { AddMemberModal } from "@/components/family/add-member-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, RefreshCw, Send, ShieldCheck, CreditCard } from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
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
        {/* Modular Page Header */}
        <PageHeader
          title="Anggota Keluarga & Kontribusi"
          description="Kelola profil anggota keluarga, tautan akun bot Telegram, dan pantau kontribusi belanja bulanan."
          icon={Users}
          isSyncing={isValidatingMembers && !isLoadingMembers}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isValidatingMembers}
            title="Segarkan data sekarang"
          >
            <RefreshCw className={cn("size-3.5", isValidatingMembers && "animate-spin")} aria-hidden="true" />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setMemberToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span>Tambah Anggota</span>
          </Button>
        </PageHeader>

        {/* Integrated Quick Info Strip using Standard Card */}
        <Card padding="default" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        </Card>

        {/* 2-Column Balanced Section: Contribution Breakdown (6 Cols) & Member Roster (6 Cols) */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left: Spending Contribution Charts (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
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

          {/* Right: Member Profiles 2-Column Grid (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[120px] rounded-xl" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
