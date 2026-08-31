"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Bot, Shield, FileText, Wallet } from "lucide-react";

interface NavbarProps {
  onOpenAddModal: () => void;
  familyName?: string;
}

export function Navbar({ onOpenAddModal, familyName = "Keluarga F&R" }: NavbarProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex h-16 items-center px-4 sm:px-8 max-w-7xl mx-auto justify-between">
        {/* Left: Brand Switcher & Main Nav */}
        <div className="flex items-center gap-6">
          {/* Family Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold text-xs tracking-tight shadow-none">
              FR
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-900 leading-tight">{familyName}</span>
              <span className="text-[11px] font-medium text-slate-500 leading-tight">Family Financial Hub</span>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block h-5 bg-slate-200" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-900 cursor-pointer">
              Keuangan
            </span>
            <span className="px-3.5 py-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors">
              Aset & Hutang
            </span>
            <span className="px-3.5 py-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors">
              Brankas Dokumen
            </span>
          </nav>
        </div>

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-slate-50/80 text-[11px] font-medium text-slate-600">
            <Bot className="size-3.5 text-emerald-600" />
            <span>Telegram Bot: Aktif</span>
          </Badge>

          <Button
            onClick={onOpenAddModal}
            size="sm"
            className="h-9 px-4 rounded-full text-xs font-semibold gap-1.5"
          >
            <Plus className="size-4" />
            <span>Catat Transaksi</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative size-9 rounded-full p-0 border border-slate-200/80">
                <Avatar className="size-9 rounded-full">
                  <AvatarFallback className="text-xs font-bold bg-slate-900 text-white rounded-full">
                    AY
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-bold leading-none text-slate-900">Ayah (Admin)</p>
                  <p className="text-[11px] text-slate-500">ayah@keluarga.hub</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem className="rounded-xl px-3 py-2">Profil Keluarga</DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl px-3 py-2">Pengaturan Bot & Webhook</DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl px-3 py-2">Integrasi Google Drive & Sheets</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
