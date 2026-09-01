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
        return "Logam Mulia";
      case "real_estate":
        return "Properti";
      case "vehicle":
        return "Kendaraan";
      case "investment":
        return "Investasi";
      case "electronics":
        return "Elektronik";
      default:
        return "Lain-lain";
    }
  };

  return (
    <Card className="rounded-xl border border-border/80 bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Daftar Aset Keluarga</CardTitle>
            <Badge variant="outline" className="text-[11px] font-normal">
              {assets.length} Item
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Kepemilikan aset fisik, instrumen investasi, dan perkiraan nilai pasar.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y border-t">
          {assets.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-medium text-foreground">Belum ada aset terdaftar.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Klik tombol "Tambah Aset" untuk mulai mencatat properti, emas, atau kendaraan keluarga.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAddModal}
                className="mt-4 gap-1.5 h-9 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Tambah Aset Sekarang</span>
              </Button>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 sm:px-5 transition-colors hover:bg-muted/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-foreground">
                    {getCategoryIcon(asset.category)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{asset.name}</span>
                      <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-normal px-1.5 py-0">
                        {getCategoryLabel(asset.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                      {asset.acquisition_date && (
                        <span>Perolehan: {formatDateIndo(asset.acquisition_date)}</span>
                      )}
                      {asset.notes && <span>{asset.acquisition_date ? "• " : ""}{asset.notes}</span>}
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
                      className="size-7 text-muted-foreground hover:text-destructive rounded-md"
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
