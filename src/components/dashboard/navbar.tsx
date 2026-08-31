"use client";

import React from "react";
import { Home, Wallet, Shield, FileText, Bell, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onOpenAddModal: () => void;
  familyName?: string;
}

export function Navbar({ onOpenAddModal, familyName = "Keluarga F&R" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900">F&R Family Hub</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-500">{familyName} • Dashboard</p>
          </div>
        </div>

        {/* Navigation Modules (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1">
          <button className="flex items-center space-x-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <Wallet className="h-4 w-4" />
            <span>Keuangan</span>
          </button>
          <button className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Shield className="h-4 w-4" />
            <span>Aset & Hutang</span>
          </button>
          <button className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <FileText className="h-4 w-4" />
            <span>Brankas Dokumen</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
            <span>Telegram Bot: Active</span>
          </div>

          <Button onClick={onOpenAddModal} size="sm" className="space-x-1.5">
            <Plus className="h-4 w-4" />
            <span>Tambah Transaksi</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
