"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "@/lib/types/database";

interface ManageWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
  onSaveWallet: (walletData: Partial<Wallet>, isEdit: boolean) => Promise<void> | void;
}

export function ManageWalletModal({
  isOpen,
  onClose,
  walletToEdit,
  onSaveWallet,
}: ManageWalletModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"bank" | "ewallet" | "cash" | "investment">("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [displayBalance, setDisplayBalance] = useState("");
  const [rawBalance, setRawBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEdit = Boolean(walletToEdit);

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name || "");
      setType((walletToEdit.type as any) || "bank");
      setAccountNumber(walletToEdit.account_number || "");
      const bal = Number(walletToEdit.current_balance || 0);
      setRawBalance(bal);
      setDisplayBalance(bal ? bal.toLocaleString("id-ID") : "0");
    } else {
      setName("");
      setType("bank");
      setAccountNumber("");
      setRawBalance(0);
      setDisplayBalance("");
    }
    setErrorMsg(null);
  }, [walletToEdit, isOpen]);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setDisplayBalance("");
      setRawBalance(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setRawBalance(num);
    setDisplayBalance(num.toLocaleString("id-ID"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Mohon masukkan nama rekening.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Wallet> = {
        ...(walletToEdit && { id: walletToEdit.id }),
        name: name.trim(),
        type,
        account_number: accountNumber.trim() || "-",
        current_balance: rawBalance,
        currency: "IDR",
        is_active: true,
      };

      await onSaveWallet(payload, isEdit);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data rekening.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Rekening / Dompet" : "Tambah Rekening / Dompet"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Perbarui informasi nama rekening, nomor akun, tipe, atau saldo kas."
                : "Daftarkan rekening bank, e-wallet, atau pos saldo kas keluarga baru."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMsg && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="walletName" className="text-xs font-medium">
                Nama Rekening / Akun <span className="text-destructive">*</span>
              </Label>
              <Input
                id="walletName"
                placeholder="Contoh: BCA Prioritas, GoPay Belanja, Bibit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="walletType" className="text-xs font-medium">
                Tipe Akun <span className="text-destructive">*</span>
              </Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger id="walletType" aria-label="Pilih Tipe Akun">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="bank">Rekening Bank (BCA, Mandiri, BNI, dll.)</SelectItem>
                    <SelectItem value="ewallet">E-Wallet (GoPay, OVO, ShopeePay)</SelectItem>
                    <SelectItem value="cash">Tunai / Kas Fisik</SelectItem>
                    <SelectItem value="investment">Investasi / Reksadana / Saham</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="accountNumber" className="text-xs font-medium">
                Nomor Rekening / No. HP (Opsional)
              </Label>
              <Input
                id="accountNumber"
                placeholder="Contoh: 5410-8291-00 atau 0812-3456-7890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="walletBalance" className="text-xs font-medium">
                {isEdit ? "Saldo Saat Ini (Rp)" : "Saldo Awal (Rp)"} <span className="text-destructive">*</span>
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-muted-foreground text-sm select-none">Rp</span>
                <Input
                  id="walletBalance"
                  type="text"
                  placeholder="0"
                  value={displayBalance}
                  onChange={handleBalanceChange}
                  className="pl-10 tabular-nums font-semibold"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Rekening"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
