"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { FamilyOverviewCards } from "@/components/family/family-overview-cards";
import { MemberCard } from "@/components/family/member-card";
import { ContributionCharts } from "@/components/family/contribution-charts";
import { AddMemberModal } from "@/components/family/add-member-modal";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2, RefreshCw } from "lucide-react";

export default function FamilyPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [unassigned, setUnassigned] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch members
      const memRes = await fetch("/api/members");
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData.members || []);
      }

      // 2. Fetch wallets for dropdown
      const walRes = await fetch("/api/wallets");
      if (walRes.ok) {
        const walData = await walRes.json();
        setWallets(walData.wallets || []);
      }

      // 3. Fetch contributions analytics
      const conRes = await fetch("/api/members/contributions");
      if (conRes.ok) {
        const conData = await conRes.json();
        setContributions(conData.contributions || []);
        setTotalExpense(conData.totalExpense || 0);
        setUnassigned(conData.unassigned || null);
      }
    } catch (err) {
      console.error("Failed to load family data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus profil anggota keluarga ini?")) return;
    try {
      const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Users className="size-7 text-primary" aria-hidden="true" />
              <h1 className="text-3xl font-bold tracking-tight">
                Anggota Keluarga & Kontribusi
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Kelola profil anggota keluarga, tautkan ID bot Telegram, dan pantau perbandingan belanja antar-anggota.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>Segarkan</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setMemberToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Tambah Anggota</span>
            </Button>
          </div>
        </div>

        {/* 1. Summary Overview Cards */}
        <FamilyOverviewCards members={members} totalExpense={totalExpense} />

        {/* 2. Visual Contribution Charts */}
        <ContributionCharts
          contributions={contributions}
          unassigned={unassigned}
          totalExpense={totalExpense}
        />

        {/* 3. Member Cards Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Daftar Anggota Keluarga ({members.length})</h2>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
              <p className="text-xs">Memuat data anggota keluarga...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-16 px-4 text-center rounded-xl border border-dashed text-muted-foreground">
              <Users className="size-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Belum Ada Anggota Keluarga</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Tambahkan profil Ayah, Ibu, atau Anak untuk mulai melacak pengeluaran per-anggota dan menautkan akun bot Telegram.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMemberToEdit(null);
                  setIsAddModalOpen(true);
                }}
                className="mt-4 text-xs gap-1.5"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Tambah Anggota Pertama</span>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onEdit={(m) => {
                    setMemberToEdit(m);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={handleDeleteMember}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
        memberToEdit={memberToEdit}
        wallets={wallets}
      />
    </div>
  );
}
