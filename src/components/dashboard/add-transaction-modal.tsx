"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Catat Transaksi Manual
            </DialogTitle>
            <DialogDescription>
              Catat mutasi keuangan yang otomatis disinkronkan ke database & Google Sheets.
            </DialogDescription>
          </DialogHeader>

          {/* Type Toggle Tabs */}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                const defaultCat = categories.find((c) => c.type === "expense");
                if (defaultCat) setCategoryId(defaultCat.id);
              }}
              className={`flex items-center justify-center rounded-md py-1.5 font-medium transition-colors ${
                type === "expense"
                  ? "bg-background text-destructive shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
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
              className={`flex items-center justify-center rounded-md py-1.5 font-medium transition-colors ${
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
              <Label htmlFor="displayAmount" className="text-xs font-medium">
                Nominal Transaksi (Rp)
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
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickAmount(q)}
                    className="h-7 rounded-md border bg-muted/40 px-2.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {q >= 1000000 ? `${q / 1000000} jt` : `${q / 1000} rb`}
                  </button>
                ))}
              </div>
            </div>

            {/* 2-Column Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="walletSelect" className="text-xs font-medium">
                  Dompet / Rekening
                </Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger id="walletSelect" aria-label="Pilih Dompet">
                    <SelectValue placeholder="Pilih rekening" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="truncate">{w.name}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="categorySelect" className="text-xs font-medium">
                  Kategori
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="categorySelect" aria-label="Pilih Kategori">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="truncate">{c.name}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description Field */}
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs font-medium">
                Keterangan / Catatan
              </Label>
              <Input
                id="description"
                name="description"
                autoComplete="off"
                type="text"
                placeholder="Contoh: Makan siang, Bensin Shell, Token PLN"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Date Field with Calendar Popover */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">
                Tanggal Transaksi
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    aria-label="Pilih Tanggal Transaksi"
                  >
                    <CalendarIcon className="mr-2 size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="font-medium truncate">
                      {selectedDate
                        ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })
                        : "Pilih tanggal"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Menyimpan…</span>
                </>
              ) : (
                "Simpan Transaksi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
