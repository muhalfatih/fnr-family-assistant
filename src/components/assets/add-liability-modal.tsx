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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMask = (val: string, setterDisplay: (v: string) => void, setterRaw: (v: number) => void) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) {
      setterDisplay("");
      setterRaw(0);
      return;
    }
    const num = parseInt(clean, 10);
    setterRaw(num);
    setterDisplay(num.toLocaleString("id-ID"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Mohon masukkan nama pinjaman/cicilan.");
      return;
    }
    if (rawTotal <= 0 || rawRemaining <= 0) {
      setErrorMsg("Mohon masukkan nominal total & sisa hutang.");
      return;
    }

    const newLiability: Liability = {
      id: `liab-${Date.now()}`,
      family_id: "fam-1",
      name: name.trim(),
      type,
      total_amount: rawTotal,
      remaining_amount: rawRemaining,
      monthly_installment: rawInstallment,
      due_date_day: parseInt(dueDateDay, 10) || 10,
      created_at: new Date().toISOString(),
    };

    onAddLiability(newLiability);
    onClose();
    setName("");
    setDisplayTotal("");
    setRawTotal(0);
    setDisplayRemaining("");
    setRawRemaining(0);
    setDisplayInstallment("");
    setRawInstallment(0);
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Catatan Hutang & Cicilan</DialogTitle>
            <DialogDescription>
              Pantau kewajiban cicilan KPR, kendaraan, atau pinjaman keluarga.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-4">
            {errorMsg && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="liabName" className="text-xs font-medium">
                Nama Pinjaman / Cicilan
              </Label>
              <Input
                id="liabName"
                placeholder="Contoh: KPR Bank BTN, Cicilan Honda HR-V, Kartu Kredit BCA"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="liabType" className="text-xs font-medium">
                  Tipe Pinjaman
                </Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger id="liabType" aria-label="Pilih Tipe Pinjaman">
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
                <Label htmlFor="dueDateDay" className="text-xs font-medium">
                  Tanggal Jatuh Tempo
                </Label>
                <Input
                  id="dueDateDay"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="10"
                  value={dueDateDay}
                  onChange={(e) => setDueDateDay(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="totalAmount" className="text-xs font-medium">
                  Total Plafon Pokok (Rp)
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="totalAmount"
                    type="text"
                    placeholder="0"
                    value={displayTotal}
                    onChange={(e) => handleMask(e.target.value, setDisplayTotal, setRawTotal)}
                    className="pl-8 tabular-nums font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="remainingAmount" className="text-xs font-medium">
                  Sisa Saldo Pokok (Rp)
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="remainingAmount"
                    type="text"
                    placeholder="0"
                    value={displayRemaining}
                    onChange={(e) => handleMask(e.target.value, setDisplayRemaining, setRawRemaining)}
                    className="pl-8 tabular-nums font-medium text-destructive"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="monthlyInstallment" className="text-xs font-medium">
                Cicilan Bulanan (Rp/Bulan)
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                <Input
                  id="monthlyInstallment"
                  type="text"
                  placeholder="0"
                  value={displayInstallment}
                  onChange={(e) => handleMask(e.target.value, setDisplayInstallment, setRawInstallment)}
                  className="pl-8 tabular-nums font-medium"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Hutang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
