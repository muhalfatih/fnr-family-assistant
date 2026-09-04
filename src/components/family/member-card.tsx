"use client";

import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatMaskedPhone } from "@/lib/utils";
import {
  CreditCard,
  Send,
  Pencil,
  Trash2,
  ShieldCheck,
  User,
  Phone,
} from "lucide-react";

interface MemberCardProps {
  member: any;
  onEdit: (member: any) => void;
  onDelete: (id: string) => void;
}

export function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isConnectedTelegram = Boolean(member.telegram_chat_id);
  const isAdmin = member.role === "admin";

  return (
    <div className="rounded-xl border border-border/70 bg-card hover:border-border transition-colors p-3.5 flex flex-col justify-between gap-2.5">
      {/* Top: Avatar, Name, Role & Action Buttons */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="size-8 sm:size-9 border border-primary/20 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {getInitials(member.full_name || "FM")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate" title={member.full_name}>
              {member.full_name}
            </h3>
            <div className="flex items-center gap-1 text-[11px] mt-0.5">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  <span>Admin</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <User className="size-3" aria-hidden="true" />
                  <span>Anggota</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Compact Actions in Top Right */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground rounded-md"
            onClick={() => onEdit(member)}
            title="Edit Profil"
            aria-label={`Edit profil ${member.full_name}`}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive rounded-md"
            onClick={() => onDelete(member.id)}
            title="Hapus Anggota"
            aria-label={`Hapus anggota ${member.full_name}`}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Body: Flat Minimalist Ledger & Channel Info */}
      <div className="space-y-1.5 pt-2 border-t border-border/50 text-[11px]">
        {/* Wallet */}
        <div className="flex items-center justify-between text-muted-foreground gap-2">
          <span className="flex items-center gap-1.5 shrink-0">
            <CreditCard className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
            <span>Dompet:</span>
          </span>
          <span className="font-medium text-foreground truncate max-w-[130px]" title={member.default_wallet?.name || "Dompet Tunai"}>
            {member.default_wallet?.name || "Dompet Tunai"}
          </span>
        </div>

        {/* Monthly Spent */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Belanja Bulan Ini:</span>
          <span className="font-bold text-foreground tabular-nums truncate">
            {formatRupiah(member.monthlySpent || 0)}
          </span>
        </div>

        {/* Telegram */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <Send className="size-3 text-blue-500 shrink-0" aria-hidden="true" />
            <span>Telegram:</span>
          </span>
          {isConnectedTelegram ? (
            <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400 truncate">
              ● ID: {member.telegram_chat_id}
            </span>
          ) : (
            <span className="text-muted-foreground/60 italic">Belum ditautkan</span>
          )}
        </div>

        {/* WhatsApp with privacy number masking */}
        {member.whatsapp_number && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Phone className="size-3 text-emerald-500 shrink-0" aria-hidden="true" />
              <span>WhatsApp:</span>
            </span>
            <span
              className="tabular-nums text-foreground/80 font-mono tracking-tight truncate"
              title={`Nomor WhatsApp ${formatMaskedPhone(member.whatsapp_number)}`}
            >
              {formatMaskedPhone(member.whatsapp_number)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
