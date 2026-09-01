"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRupiah } from "@/lib/utils";
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

  return (
    <Card className="rounded-xl border border-border/80 hover:border-primary/40 transition-colors flex flex-col justify-between">
      <CardContent className="p-4 space-y-3">
        {/* Top: Avatar, Name & Role Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="size-10 border border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                {getInitials(member.full_name || "FM")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-snug text-foreground truncate">
                {member.full_name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {member.role === "admin" ? "Pengelola (Admin)" : "Anggota Keluarga"}
              </p>
            </div>
          </div>

          <Badge
            variant={member.role === "admin" ? "default" : "secondary"}
            className="text-[11px] capitalize gap-1 font-medium shrink-0"
          >
            {member.role === "admin" ? (
              <ShieldCheck className="size-3" aria-hidden="true" />
            ) : (
              <User className="size-3" aria-hidden="true" />
            )}
            <span>{member.role}</span>
          </Badge>
        </div>

        {/* Middle Stats: Wallet & Monthly Spent */}
        <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-muted/40 border">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Dompet Default:</p>
            <div className="flex items-center gap-1.5 font-medium truncate mt-0.5" title={member.default_wallet?.name || "Dompet Tunai"}>
              <CreditCard className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="truncate">{member.default_wallet?.name || "Dompet Tunai"}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Belanja Bulan Ini:</p>
            <p className="font-semibold text-foreground truncate mt-0.5 tabular-nums">
              {formatRupiah(member.monthlySpent || 0)}
            </p>
          </div>
        </div>

        {/* Channels: Telegram & WhatsApp status */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Send className="size-3 text-blue-500" aria-hidden="true" />
              <span>Telegram Chat:</span>
            </span>
            {isConnectedTelegram ? (
              <Badge variant="outline" className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                ● ID: {member.telegram_chat_id}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground italic">Belum ditautkan</span>
            )}
          </div>

          {member.whatsapp_number && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Phone className="size-3 text-emerald-500" aria-hidden="true" />
                <span>WhatsApp:</span>
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {member.whatsapp_number}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t text-xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(member)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span>Edit Profil</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(member.id)}
            title="Hapus Anggota"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
