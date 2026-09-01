"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { FamilyOverviewCards } from "@/components/family/family-overview-cards";
import { MemberCard } from "@/components/family/member-card";
import { ContributionCharts } from "@/components/family/contribution-charts";
import { AddMemberModal } from "@/components/family/add-member-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, RefreshCw } from "lucide-react";
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

  const isInitialLoading = isLoadingMembers && members.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      {/* Main Container */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Users className="size-7 text-primary" aria-hidden="true" />
              <h1 className="text-3xl font-bold tracking-tight">
                Anggota Keluarga & Kontribusi
              </h1>
              {isValidatingMembers && !isLoadingMembers && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded-full animate-pulse">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sinkronisasi...</span>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Kelola profil anggota keluarga, tautan akun bot Telegram, dan pantau kontribusi belanja bulanan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="gap-1.5 h-9 text-xs"
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
              className="gap-1.5 h-9 text-xs"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Tambah Anggota</span>
            </Button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        {isInitialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[106px] rounded-xl" />
            ))}
          </div>
        ) : (
          <FamilyOverviewCards members={members} totalExpense={totalExpense} />
        )}

        {/* 2-Column Section: Contribution Breakdown & Members Grid */}
        <div className="grid gap-6 lg:grid-cols-7 items-start">
          {/* Left / Top: Spending Contribution Charts (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
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
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Daftar Profil ({members.length})
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
                <p className="text-sm font-semibold text-foreground">Belum Ada Anggota</p>
                <p className="text-xs mt-1">
                  Tambahkan profil anggota keluarga pertama untuk mulai memantau kontribusi belanja.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-3 text-xs gap-1.5"
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
      </main>

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
    </div>
  );
}
