"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Category } from "@/lib/types/database";
import { cn, formatRupiah } from "@/lib/utils";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [displayAmount, setDisplayAmount] = useState<string>("");
  const [rawAmount, setRawAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id || "");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setDisplayAmount("");
      setRawAmount(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setRawAmount(num);
    setDisplayAmount(num.toLocaleString("id-ID"));
  };

  const handleQuickAmount = (val: number) => {
    setRawAmount(val);
    setDisplayAmount(val.toLocaleString("id-ID"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawAmount || rawAmount <= 0) {
      setErrorMsg("Mohon masukkan nominal yang valid.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: rawAmount,
          description: description.trim() || undefined,
          wallet_id: walletId || wallets[0]?.id,
          category_id: categoryId || undefined,
          transaction_date: selectedDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan transaksi.");
      }

      onSuccess();
      onClose();
      setDisplayAmount("");
      setRawAmount(0);
      setDescription("");
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);
  const quickAmounts = [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden sm:rounded-3xl border border-slate-200 shadow-none">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Catat Transaksi Manual
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Catat mutasi keuangan yang langsung disinkronkan ke database & Google Sheets.
              </DialogDescription>
            </DialogHeader>

            {/* Segmented Rounded Type Toggle */}
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-slate-200/80 bg-slate-100/90 p-1">
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  const defaultCat = categories.find((c) => c.type === "expense");
                  if (defaultCat) setCategoryId(defaultCat.id);
                }}
                className={`flex items-center justify-center rounded-full py-1.5 text-xs font-bold transition-all ${
                  type === "expense"
                    ? "bg-white text-rose-600 border border-slate-200/70 shadow-none"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  const defaultCat = categories.find((c) => c.type === "income");
                  if (defaultCat) setCategoryId(defaultCat.id);
                }}
                className={`flex items-center justify-center rounded-full py-1.5 text-xs font-bold transition-all ${
                  type === "income"
                    ? "bg-white text-emerald-600 border border-slate-200/70 shadow-none"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="flex flex-col gap-4 p-6">
            {errorMsg && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {errorMsg}
              </div>
            )}

            {/* Amount Field with Live Currency Masking */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayAmount" className="text-xs font-semibold text-slate-700">
                Nominal Transaksi (Rp)
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-bold text-slate-400 text-sm select-none">Rp</span>
                <Input
                  id="displayAmount"
                  type="text"
                  required
                  autoFocus
                  placeholder="0"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  className="h-12 text-xl font-bold tabular-nums pl-12 rounded-xl"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickAmount(q)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {q >= 1000000 ? `${q / 1000000} jt` : `${q / 1000} rb`}
                  </button>
                ))}
              </div>
            </div>

            {/* 2-Column Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="walletSelect" className="text-xs font-semibold text-slate-700">
                  Dompet / Rekening
                </Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger id="walletSelect" className="h-10 rounded-xl">
                    <SelectValue placeholder="Pilih rekening" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectGroup>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id} className="rounded-lg">
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span>{w.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({formatRupiah(w.current_balance)})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="categorySelect" className="text-xs font-semibold text-slate-700">
                  Kategori
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="categorySelect" className="h-10 rounded-xl">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectGroup>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="rounded-lg">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description Field */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
                Keterangan / Catatan
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="Contoh: Makan siang, Bensin Shell, Token PLN"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {/* Date Field with Shadcn Calendar Popover */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Tanggal Transaksi
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 w-full justify-start text-left font-normal rounded-xl border border-slate-200 bg-white px-3.5 text-xs",
                      !selectedDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">
                      {selectedDate
                        ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })
                        : "Pilih tanggal"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border border-slate-200" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-5 rounded-full text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-full text-xs font-semibold"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
