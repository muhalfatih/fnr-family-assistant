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
import { DatePicker } from "@/components/ui/date-picker";
import { Asset, AssetCategory } from "@/lib/types/database";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (asset: Asset) => void;
}

export function AddAssetModal({
  isOpen,
  onClose,
  onAddAsset,
}: AddAssetModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("gold");
  const [displayValue, setDisplayValue] = useState("");
  const [rawValue, setRawValue] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^0-9]/g, "");
    if (!clean) {
      setDisplayValue("");
      setRawValue(0);
      return;
    }
    const num = parseInt(clean, 10);
    setRawValue(num);
    setDisplayValue(new Intl.NumberFormat("id-ID").format(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama aset wajib diisi");
      return;
    }
    if (rawValue <= 0) {
      setErrorMsg("Nilai pasar aset harus lebih besar dari 0");
      return;
    }

    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      family_id: "fam-1",
      name: name.trim(),
      category,
      estimated_value: rawValue,
      acquisition_date: purchaseDate || null,
      notes: notes.trim() || null,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    onAddAsset(newAsset);
    onClose();

    // Reset Form
    setName("");
    setCategory("gold");
    setDisplayValue("");
    setRawValue(0);
    setPurchaseDate("");
    setNotes("");
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Aset Keluarga</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Catat kepemilikan aset berharga keluarga (emas, properti, kendaraan, dll.).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMsg && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="assetName" className="text-xs font-medium text-foreground">
                Nama Aset <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="assetName"
                placeholder="Contoh: Logam Mulia Antam 50g, Rumah Cinere, Honda HR-V"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="assetCategory" className="text-xs font-medium text-foreground">
                  Kategori Aset <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                  <SelectTrigger id="assetCategory" className="h-9 text-xs w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="gold">Logam Mulia / Emas</SelectItem>
                      <SelectItem value="real_estate">Properti & Tanah</SelectItem>
                      <SelectItem value="vehicle">Kendaraan</SelectItem>
                      <SelectItem value="investment">Investasi / Saham</SelectItem>
                      <SelectItem value="electronics">Elektronik & Gadget</SelectItem>
                      <SelectItem value="other">Lain-lain</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="assetValue" className="text-xs font-medium text-foreground">
                  Estimasi Nilai Pasar (Rp) <span className="text-destructive ml-0.5">*</span>
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="assetValue"
                    type="text"
                    placeholder="0"
                    value={displayValue}
                    onChange={handleValueChange}
                    className="pl-8 h-9 text-xs tabular-nums font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5 min-w-0">
                <Label className="text-xs font-medium text-foreground">
                  Tanggal Perolehan (Opsional)
                </Label>
                <DatePicker
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                  placeholder="Pilih tanggal perolehan"
                />
              </div>

              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="assetNotes" className="text-xs font-medium text-foreground">
                  Catatan / Lokasi Simpan
                </Label>
                <Input
                  id="assetNotes"
                  placeholder="Contoh: Brankas Rumah / Safe Deposit Box BCA"
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
              Simpan Aset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
