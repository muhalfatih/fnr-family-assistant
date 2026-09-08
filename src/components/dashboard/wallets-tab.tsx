"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ManageWalletModal } from "@/components/dashboard/manage-wallet-modal";
import { Wallet } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  TrendingUp,
  Pencil,
  Trash2,
} from "lucide-react";

interface WalletsTabProps {
  wallets: Wallet[];
  onMutate: () => void;
}

export function WalletsTab({ wallets, onMutate }: WalletsTabProps) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);

  const handleOpenAddWallet = () => {
    setWalletToEdit(null);
    setIsWalletModalOpen(true);
  };

  const handleOpenEditWallet = (wallet: Wallet) => {
    setWalletToEdit(wallet);
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = async (walletData: Partial<Wallet>, isEdit: boolean) => {
    try {
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch("/api/wallets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walletData),
      });
      if (res.ok) {
        onMutate();
      }
    } catch (err) {
      console.error("Failed to save wallet:", err);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    try {
      const res = await fetch(`/api/wallets?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onMutate();
        setWalletToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete wallet:", err);
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "bank":
        return <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />;
      case "ewallet":
        return <Smartphone className="size-4 text-muted-foreground" aria-hidden="true" />;
      case "cash":
        return <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />;
      case "investment":
        return <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />;
      default:
        return <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Rekening & Dompet Kas</h2>
          <p className="text-xs text-muted-foreground">
            Daftar seluruh rekening bank, e-wallet, dan dompet fisik keluarga. Anda dapat menambah,
            mengubah, atau menghapus akun.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAddWallet}
          className="gap-1.5 h-8 text-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          <span>Tambah Rekening</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl border-dashed">
            <CreditCard className="size-8 mx-auto mb-2 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-xs font-medium">Belum ada rekening terdaftar</p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              Tambahkan rekening bank, e-wallet, atau dompet tunai pertama Anda.
            </p>
          </div>
        ) : (
          wallets.map((w) => (
            <Card
              key={w.id}
              className="rounded-xl border border-border/80 bg-card hover:border-border transition-all flex flex-col justify-between"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
                <div className="space-y-1 min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate text-foreground">{w.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase px-1.5 py-0 shrink-0"
                    >
                      {w.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums truncate">
                    {w.account_number && w.account_number !== "-" ? w.account_number : "Kas Pribadi"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">{getWalletIcon(w.type)}</div>
              </CardHeader>
              <CardContent className="p-4 pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                    Saldo Saat Ini
                  </span>
                  <div className="text-lg font-bold tracking-tight text-foreground truncate">
                    {formatRupiah(w.current_balance)}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditWallet(w)}
                    className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                    title="Edit Rekening"
                    aria-label={`Edit rekening ${w.name}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWalletToDelete(w)}
                    className="size-7 text-muted-foreground hover:text-destructive rounded-md"
                    title="Hapus Rekening"
                    aria-label={`Hapus rekening ${w.name}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Tambah / Edit Rekening */}
      <ManageWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        walletToEdit={walletToEdit}
        onSaveWallet={handleSaveWallet}
      />

      {/* Delete Wallet Alert Dialog */}
      <AlertDialog
        open={!!walletToDelete}
        onOpenChange={(open) => !open && setWalletToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Rekening Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Rekening{" "}
              <strong className="text-foreground font-semibold">{walletToDelete?.name}</strong>{" "}
              dengan saldo saat ini{" "}
              <strong className="text-foreground font-semibold">
                {walletToDelete ? formatRupiah(walletToDelete.current_balance) : ""}
              </strong>{" "}
              akan dihapus dari daftar rekening kas keluarga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-9 text-xs px-3 cursor-pointer">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => walletToDelete && handleDeleteWallet(walletToDelete.id)}
              className="w-full sm:w-auto h-9 text-xs px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Hapus Rekening
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
