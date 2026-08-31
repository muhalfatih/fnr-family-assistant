"use client";

import React, { useState } from "react";
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
  onAddWallet: (wallet: Wallet) => void;
}

export function ManageWalletModal({
  isOpen,
  onClose,
  onAddWallet,
}: ManageWalletModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"bank" | "ewallet" | "cash" | "investment">("bank");
  const [displayBalance, setDisplayBalance] = useState("");
  const [rawBalance, setRawBalance] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Mohon masukkan nama rekening.");
      return;
    }

    const newWallet: Wallet = {
      id: `w-${Date.now()}`,
      family_id: "fam-1",
      name: name.trim(),
      type,
      current_balance: rawBalance,
      currency: "IDR",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onAddWallet(newWallet);
    onClose();
    setName("");
    setDisplayBalance("");
    setRawBalance(0);
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Rekening / Dompet</DialogTitle>
            <DialogDescription>
              Daftarkan rekening bank, e-wallet, atau pos saldo kas keluarga baru.
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
                Nama Rekening / Akun
              </Label>
              <Input
                id="walletName"
                placeholder="Contoh: Bank Jago, ShopeePay, Bibit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="walletType" className="text-xs font-medium">
                Tipe Akun
              </Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger id="walletType" aria-label="Pilih Tipe Akun">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="bank">Rekening Bank (BCA, Mandiri, dll.)</SelectItem>
                    <SelectItem value="ewallet">E-Wallet (Gopay, OVO, ShopeePay)</SelectItem>
                    <SelectItem value="cash">Tunai / Dompet Fisik</SelectItem>
                    <SelectItem value="investment">Investasi / Reksadana</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="walletBalance" className="text-xs font-medium">
                Saldo Awal (Rp)
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Rekening
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
