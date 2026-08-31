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
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setDisplayValue("");
      setRawValue(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setRawValue(num);
    setDisplayValue(num.toLocaleString("id-ID"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Mohon masukkan nama aset.");
      return;
    }
    if (rawValue <= 0) {
      setErrorMsg("Mohon masukkan estimasi nilai aset.");
      return;
    }

    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      family_id: "fam-1",
      name: name.trim(),
      category,
      estimated_value: rawValue,
      acquisition_date: acquisitionDate || new Date().toISOString(),
      notes: notes.trim() || undefined,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    onAddAsset(newAsset);
    onClose();
    setName("");
    setDisplayValue("");
    setRawValue(0);
    setAcquisitionDate("");
    setNotes("");
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Aset Keluarga</DialogTitle>
            <DialogDescription>
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
              <Label htmlFor="assetName" className="text-xs font-medium">
                Nama Aset
              </Label>
              <Input
                id="assetName"
                placeholder="Contoh: Logam Mulia Antam 50g, Rumah Cinere, Honda HR-V"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="grid gap-1.5 min-w-0">
                <Label htmlFor="assetCategory" className="text-xs font-medium">
                  Kategori Aset
                </Label>
                <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                  <SelectTrigger id="assetCategory" aria-label="Pilih Kategori Aset">
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
                <Label htmlFor="assetValue" className="text-xs font-medium">
                  Estimasi Nilai Pasar (Rp)
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">Rp</span>
                  <Input
                    id="assetValue"
                    type="text"
                    placeholder="0"
                    value={displayValue}
                    onChange={handleValueChange}
                    className="pl-8 tabular-nums font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="assetDate" className="text-xs font-medium">
                Tanggal Perolehan (Opsional)
              </Label>
              <Input
                id="assetDate"
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="assetNotes" className="text-xs font-medium">
                Catatan / Lokasi Penyimpanan
              </Label>
              <Input
                id="assetNotes"
                placeholder="Contoh: Safe Deposit Box BCA, Atas nama Ibu"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Aset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
