"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { Users, Send, ShieldCheck, TrendingUp } from "lucide-react";

interface FamilyOverviewCardsProps {
  members: any[];
  totalExpense: number;
}

export function FamilyOverviewCards({ members, totalExpense }: FamilyOverviewCardsProps) {
  const totalMembers = members.length;
  const connectedTelegram = members.filter((m) => Boolean(m.telegram_chat_id)).length;
  const admins = members.filter((m) => m.role === "admin").length;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Anggota */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Anggota Keluarga</p>
            <p className="text-2xl font-bold tracking-tight">{totalMembers}</p>
            <p className="text-[11px] text-muted-foreground">Profil Terdaftar</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Pengeluaran Bulan Ini */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Total Belanja Bulan Ini</p>
            <p className="text-2xl font-bold tracking-tight text-foreground truncate">
              {formatRupiah(totalExpense)}
            </p>
            <p className="text-[11px] text-muted-foreground">Gabungan Seluruh Anggota</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Terhubung ke Telegram Bot */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Terhubung ke Telegram</p>
            <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {connectedTelegram} <span className="text-sm font-normal text-muted-foreground">/ {totalMembers}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">Dapat Mencatat via Chat</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Send className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Pengelola (Admin) */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Hak Akses Admin</p>
            <p className="text-2xl font-bold tracking-tight">{admins}</p>
            <p className="text-[11px] text-muted-foreground">Pengelola Pagu & Aset</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
