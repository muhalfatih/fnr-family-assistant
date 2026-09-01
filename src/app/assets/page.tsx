"use client";

import React, { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { NetWorthSummary } from "@/components/assets/net-worth-summary";
import { AssetList } from "@/components/assets/asset-list";
import { LiabilityList } from "@/components/assets/liability-list";
import { AddAssetModal } from "@/components/assets/add-asset-modal";
import { AddLiabilityModal } from "@/components/assets/add-liability-modal";
import { Asset, Liability } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, Landmark, RefreshCw, Plus } from "lucide-react";
import { useAssets, useLiabilities, useWallets } from "@/lib/hooks/use-family-data";

export default function AssetsPage() {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);

  // SWR Caching & Real-time Auto-sync Hooks
  const { assets, isLoading: isLoadingAssets, isValidating: isValidatingAssets, mutate: mutateAssets } = useAssets();
  const { liabilities, isLoading: isLoadingLiabilities, mutate: mutateLiabilities } = useLiabilities();
  const { wallets, mutate: mutateWallets } = useWallets();

  const refreshAll = () => {
    mutateAssets();
    mutateLiabilities();
    mutateWallets();
  };

  const cashBalance = useMemo(() => {
    return wallets.reduce((acc: number, w: any) => acc + Number(w.current_balance || 0), 0);
  }, [wallets]);

  const totalAssetValue = useMemo(() => {
    return assets.reduce((acc, curr) => acc + Number(curr.estimated_value || 0), 0);
  }, [assets]);

  const totalLiabilityValue = useMemo(() => {
    return liabilities.reduce((acc, curr) => acc + Number(curr.remaining_amount || 0), 0);
  }, [liabilities]);

  const handleAddAsset = async (newAsset: Asset) => {
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });
      if (res.ok) {
        mutateAssets();
      }
    } catch (err) {
      console.error("Failed to sync asset to Supabase:", err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        mutateAssets();
      }
    } catch (err) {
      console.error("Failed to delete asset in Supabase:", err);
    }
  };

  const handleAddLiability = async (newLiability: Liability) => {
    try {
      const res = await fetch("/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLiability),
      });
      if (res.ok) {
        mutateLiabilities();
      }
    } catch (err) {
      console.error("Failed to sync liability to Supabase:", err);
    }
  };

  const handleDeleteLiability = async (id: string) => {
    try {
      const res = await fetch(`/api/liabilities?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        mutateLiabilities();
      }
    } catch (err) {
      console.error("Failed to delete liability in Supabase:", err);
    }
  };

  const isInitialLoading = isLoadingAssets && assets.length === 0;

  return (
    <AppShell>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <Landmark className="size-6 text-foreground shrink-0" aria-hidden="true" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                Aset & Liabilitas
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Pemantauan kekayaan bersih keluarga (Net Worth), kepemilikan aset, dan progres cicilan hutang.
              </p>
              {isValidatingAssets && !isLoadingAssets && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sync</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="gap-1.5 h-8 text-xs px-2.5 rounded-md"
              title="Segarkan data sekarang"
            >
              <RefreshCw className={`size-3.5 ${isValidatingAssets ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssetModalOpen(true)}
              className="gap-1.5 h-8 text-xs px-3 rounded-md"
            >
              <Gem className="size-3.5 text-foreground" aria-hidden="true" />
              <span>Tambah Aset</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsLiabilityModalOpen(true)}
              className="gap-1.5 h-8 text-xs px-3 rounded-md shadow-sm"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah Hutang</span>
            </Button>
          </div>
        </div>

        {/* Executive Balance Sheet Summary */}
        {isInitialLoading ? (
          <Skeleton className="h-[170px] rounded-xl" />
        ) : (
          <NetWorthSummary
            totalCash={cashBalance}
            totalAssets={totalAssetValue}
            totalLiabilities={totalLiabilityValue}
          />
        )}

        {/* Canonical Shadcn Tabs Navigation */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border border-border/50">
            <TabsTrigger value="all" className="text-xs">
              Semua ({assets.length + liabilities.length})
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs">
              Aset Fisik & Investasi ({assets.length})
            </TabsTrigger>
            <TabsTrigger value="liabilities" className="text-xs">
              Kewajiban / Hutang ({liabilities.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ALL (SPLIT GRID) */}
          <TabsContent value="all" className="space-y-6">
            {isInitialLoading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-[380px] rounded-xl" />
                <Skeleton className="h-[380px] rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <AssetList
                  assets={assets}
                  onOpenAddModal={() => setIsAssetModalOpen(true)}
                  onDeleteAsset={handleDeleteAsset}
                />
                <LiabilityList
                  liabilities={liabilities}
                  onOpenAddModal={() => setIsLiabilityModalOpen(true)}
                  onDeleteLiability={handleDeleteLiability}
                />
              </div>
            )}
          </TabsContent>

          {/* TAB 2: ONLY ASSETS */}
          <TabsContent value="assets">
            {isInitialLoading ? (
              <Skeleton className="h-[380px] rounded-xl" />
            ) : (
              <AssetList
                assets={assets}
                onOpenAddModal={() => setIsAssetModalOpen(true)}
                onDeleteAsset={handleDeleteAsset}
              />
            )}
          </TabsContent>

          {/* TAB 3: ONLY LIABILITIES */}
          <TabsContent value="liabilities">
            {isInitialLoading ? (
              <Skeleton className="h-[380px] rounded-xl" />
            ) : (
              <LiabilityList
                liabilities={liabilities}
                onOpenAddModal={() => setIsLiabilityModalOpen(true)}
                onDeleteLiability={handleDeleteLiability}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Dialogs */}
      <AddAssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onAddAsset={handleAddAsset}
      />
      <AddLiabilityModal
        isOpen={isLiabilityModalOpen}
        onClose={() => setIsLiabilityModalOpen(false)}
        onAddLiability={handleAddLiability}
      />
    </AppShell>
  );
}
