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
import { Liability, LiabilityType } from "@/lib/types/database";

interface AddLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLiability: (liability: Liability) => void;
}

export function AddLiabilityModal({
  isOpen,
  onClose,
  onAddLiability,
}: AddLiabilityModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<LiabilityType>("mortgage");
  const [displayTotal, setDisplayTotal] = useState("");
  const [rawTotal, setRawTotal] = useState(0);
  const [displayRemaining, setDisplayRemaining] = useState("");
  const [rawRemaining, setRawRemaining] = useState(0);
  const [displayInstallment, setDisplayInstallment] = useState("");
  const [rawInstallment, setRawInstallment] = useState(0);
  const [dueDateDay, setDueDateDay] = useState("10");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMask = (
    val: string,
    setDisplay: (v: string) => void,
    setRaw: (v: number) => void
  ) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) {
      setDisplay("");
      setRaw(0);
      return;
    }
    const num = parseInt(clean, 10);
    setRaw(num);
    setDisplay(new Intl.NumberFormat("id-ID").format(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama hutang/pinjaman wajib diisi");
      return;
    }
    if (rawTotal <= 0 || rawRemaining <= 0) {
      setErrorMsg("Nominal total dan sisa pokok hutang harus lebih besar dari 0");
      return;
    }

    const newLiability: Liability = {
      id: `liab-${Date.now()}`,
      family_id: "fam-1",
      name: name.trim(),
      type,
      total_amount: rawTotal,
      remaining_amount: rawRemaining,
      monthly_installment: rawInstallment || 0,
      due_date_day: dueDateDay ? parseInt(dueDateDay, 10) : null,
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
    };

    onAddLiability(newLiability);
    onClose();

    // Reset Form
    setName("");
    setType("mortgage");
    setDisplayTotal("");
    setRawTotal(0);
    setDisplayRemaining("");
    setRawRemaining(0);
    setDisplayInstallment("");
    setRawInstallment(0);
    setDueDateDay("10");
    setNotes("");
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Catatan Hutang / Cicilan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pantau sisa pokok pinjaman, cicilan bulanan, dan jadwal tanggal jatuh tempo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMsg && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="liabName" className="text-xs font-medium text-foreground">
                Nama Pinjaman / Cicilan <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="liabName"
                placeholder="Contoh: KPR BTN Rumah Cinere, Cicilan HR-V BCA Finance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="liabType" className="text-xs font-medium text-foreground">
                  Tipe Pinjaman <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger id="liabType" className="h-9 text-xs w-full">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="mortgage">KPR Rumah / Properti</SelectItem>
                      <SelectItem value="vehicle_loan">Cicilan Kendaraan</SelectItem>
                      <SelectItem value="credit_card">Kartu Kredit / Paylater</SelectItem>
                      <SelectItem value="personal_loan">Pinjaman Pribadi</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="dueDateDay" className="text-xs font-medium text-foreground">
                  Tanggal Jatuh Tempo (1-31)
                </Label>
                <Input
                  id="dueDateDay"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Contoh: 10"
                  value={dueDateDay}
                  onChange={(e) => setDueDateDay(e.target.value)}
                  className="h-9 text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="totalAmount" className="text-xs font-medium text-foreground">
                  Total Plafon Pokok (Rp) <span className="text-destructive ml-0.5">*</span>
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="totalAmount"
                    type="text"
                    placeholder="0"
                    value={displayTotal}
                    onChange={(e) => handleMask(e.target.value, setDisplayTotal, setRawTotal)}
                    className="pl-8 h-9 text-xs tabular-nums font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="remainingAmount" className="text-xs font-medium text-foreground">
                  Sisa Saldo Pokok (Rp) <span className="text-destructive ml-0.5">*</span>
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="remainingAmount"
                    type="text"
                    placeholder="0"
                    value={displayRemaining}
                    onChange={(e) => handleMask(e.target.value, setDisplayRemaining, setRawRemaining)}
                    className="pl-8 h-9 text-xs tabular-nums font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="monthlyInstallment" className="text-xs font-medium text-foreground">
                  Cicilan per Bulan (Opsional)
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="monthlyInstallment"
                    type="text"
                    placeholder="0"
                    value={displayInstallment}
                    onChange={(e) => handleMask(e.target.value, setDisplayInstallment, setRawInstallment)}
                    className="pl-8 h-9 text-xs tabular-nums font-medium"
                  />
                </div>
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="liabNotes" className="text-xs font-medium text-foreground">
                  Catatan / Keterangan
                </Label>
                <Input
                  id="liabNotes"
                  placeholder="Contoh: Tenor 15 tahun, suku bunga fixed 3th"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs px-3"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5 h-9 text-xs px-3"
            >
              Simpan Pinjaman
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
