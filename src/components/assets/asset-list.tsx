"use client";

import React from "react";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Asset } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gem, Home, Car, TrendingUp, Tv, Box, Trash2, Plus } from "lucide-react";

interface AssetListProps {
  assets: Asset[];
  onOpenAddModal: () => void;
  onDeleteAsset?: (id: string) => void;
}

export function AssetList({ assets, onOpenAddModal, onDeleteAsset }: AssetListProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "gold":
        return <Gem className="size-4 text-amber-500" aria-hidden="true" />;
      case "real_estate":
        return <Home className="size-4 text-blue-500" aria-hidden="true" />;
      case "vehicle":
        return <Car className="size-4 text-emerald-500" aria-hidden="true" />;
      case "investment":
        return <TrendingUp className="size-4 text-purple-500" aria-hidden="true" />;
      case "electronics":
        return <Tv className="size-4 text-slate-500" aria-hidden="true" />;
      default:
        return <Box className="size-4 text-slate-400" aria-hidden="true" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "gold":
        return "Logam Mulia / Emas";
      case "real_estate":
        return "Properti & Tanah";
      case "vehicle":
        return "Kendaraan";
      case "investment":
        return "Investasi & Saham";
      case "electronics":
        return "Elektronik & Gadget";
      default:
        return "Lain-lain";
    }
  };

  const totalAssetValue = assets.reduce((acc, curr) => acc + curr.estimated_value, 0);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle>Daftar Aset Keluarga</CardTitle>
            <Badge variant="outline" className="text-xs font-normal">
              {assets.length} Item
            </Badge>
          </div>
          <CardDescription>
            Estimasi nilai pasar seluruh aset fisik dan instrumen investasi
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-muted-foreground uppercase font-medium">Total Nilai</p>
            <p className="text-sm font-bold tabular-nums text-foreground">{formatRupiah(totalAssetValue)}</p>
          </div>
          <Button onClick={onOpenAddModal} size="sm" className="gap-1.5">
            <Plus className="size-4" aria-hidden="true" />
            <span>Tambah Aset</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {assets.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Belum ada aset terdaftar.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Klik tombol "Tambah Aset" untuk mulai mencatat properti, emas, atau kendaraan keluarga.
              </p>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 sm:px-6 transition-colors hover:bg-muted/50 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground">
                    {getCategoryIcon(asset.category)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{asset.name}</span>
                      <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-normal">
                        {getCategoryLabel(asset.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      {asset.acquisition_date && (
                        <span>Perolehan: {formatDateIndo(asset.acquisition_date)}</span>
                      )}
                      {asset.notes && <span>• {asset.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-3">
                  <span className="font-semibold text-sm sm:text-base tabular-nums text-foreground">
                    {formatRupiah(asset.estimated_value)}
                  </span>
                  {onDeleteAsset && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteAsset(asset.id)}
                      className="size-7 text-muted-foreground hover:text-destructive"
                      title="Hapus Aset"
                      aria-label={`Hapus aset ${asset.name}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
