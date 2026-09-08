"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Wallet, Category } from "@/lib/types/database";
import { formatRupiah } from "@/lib/utils";
import { Loader2, SlidersHorizontal } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  onOpenManageCategories?: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
  onOpenManageCategories,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [displayAmount, setDisplayAmount] = useState<string>("");
  const [rawAmount, setRawAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id || "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [dateString, setDateString] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter kategori berdasarkan tipe aktif (pengeluaran vs pemasukan)
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Handler pergantian tipe transaksi dengan auto-select kategori pertama
  const handleTypeChange = (newType: "expense" | "income") => {
    setType(newType);
    const matching = categories.filter((c) => c.type === newType);
    setCategoryId(matching.length > 0 ? matching[0].id : "");
  };

  // Sinkronisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setType("expense");
      const expenseList = categories.filter((c) => c.type === "expense");
      setCategoryId(expenseList.length > 0 ? expenseList[0].id : "");
      if (wallets.length > 0) {
        setWalletId(wallets[0].id);
      }
      setDisplayAmount("");
      setRawAmount(0);
      setDescription("");
      setErrorMsg(null);
    }
  }, [isOpen, categories, wallets]);

  // Pastikan categoryId selalu valid terhadap kategori yang terfilter
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const exists = filteredCategories.some((c) => c.id === categoryId);
      if (!exists) {
        setCategoryId(filteredCategories[0].id);
      }
    } else {
      setCategoryId("");
    }
  }, [filteredCategories, categoryId]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setDisplayAmount("");
      setRawAmount(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setRawAmount(num);
    setDisplayAmount(new Intl.NumberFormat("id-ID").format(num));
  };

  const handleQuickAmount = (amount: number) => {
    setRawAmount(amount);
    setDisplayAmount(new Intl.NumberFormat("id-ID").format(amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawAmount <= 0) {
      setErrorMsg("Nominal transaksi harus lebih besar dari 0");
      return;
    }
    if (!walletId) {
      setErrorMsg("Pilih dompet / rekening transaksi");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        wallet_id: walletId,
        category_id: categoryId || null,
        amount: rawAmount,
        type,
        description: description.trim() || (type === "expense" ? "Pengeluaran Manual" : "Pemasukan Manual"),
        transaction_date: dateString,
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal mencatat transaksi");
      }

      onSuccess();
      onClose();

      setDisplayAmount("");
      setRawAmount(0);
      setDescription("");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem saat menyimpan transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Catat Transaksi Baru</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Catat mutasi arus kas secara manual ke dalam pembukuan keluarga.
            </DialogDescription>
          </DialogHeader>

          {/* Type Segmented Controls */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-center font-medium text-xs mt-3">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`rounded-md py-1.5 transition-all cursor-pointer ${
                type === "expense"
                  ? "bg-background text-destructive shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`rounded-md py-1.5 transition-all cursor-pointer ${
                type === "income"
                  ? "bg-background text-emerald-600 shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pemasukan
            </button>
          </div>

          {/* Form Body */}
          <div className="grid gap-4 py-4">
            {errorMsg && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Amount Field */}
            <div className="grid gap-1.5">
              <Label htmlFor="displayAmount" className="text-xs font-medium text-foreground">
                Nominal Transaksi (Rp) <span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-muted-foreground text-sm select-none">Rp</span>
                <Input
                  id="displayAmount"
                  name="amount"
                  inputMode="numeric"
                  autoComplete="off"
                  type="text"
                  required
                  autoFocus
                  placeholder="0"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  className="h-10 text-lg font-bold tabular-nums pl-10"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[50000, 100000, 250000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors tabular-nums"
                  >
                    +{formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet & Category 2-Column Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Wallet Select */}
              <div className="grid gap-1.5">
                <Label htmlFor="wallet" className="text-xs font-medium text-foreground">
                  Rekening / Dompet <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger id="wallet" className="h-9 text-xs w-full">
                    <SelectValue placeholder="Pilih Dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Select */}
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category" className="text-xs font-medium text-foreground">
                    Kategori {type === "expense" ? "Pengeluaran" : "Pemasukan"}
                  </Label>
                  {onOpenManageCategories && (
                    <button
                      type="button"
                      onClick={onOpenManageCategories}
                      className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <SlidersHorizontal className="size-3" />
                      <span>Kelola Kategori</span>
                    </button>
                  )}
                </div>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={filteredCategories.length === 0}
                >
                  <SelectTrigger id="category" className="h-9 text-xs w-full cursor-pointer">
                    <SelectValue
                      placeholder={
                        filteredCategories.length === 0
                          ? `Belum ada kategori ${type === "expense" ? "pengeluaran" : "pemasukan"}`
                          : "Pilih Kategori"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description Field */}
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs font-medium text-foreground">
                Keterangan / Catatan
              </Label>
              <Input
                id="description"
                name="description"
                autoComplete="off"
                type="text"
                className="h-9 text-xs"
                placeholder="Contoh: Makan siang, Bensin Shell, Token PLN"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Date Field with DatePicker */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Tanggal Transaksi <span className="text-destructive ml-0.5">*</span>
              </Label>
              <DatePicker
                value={dateString}
                onChange={setDateString}
                placeholder="Pilih tanggal transaksi"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto h-9 text-xs px-3"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="w-full sm:w-auto gap-1.5 h-9 text-xs px-3"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>Simpan Transaksi</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
