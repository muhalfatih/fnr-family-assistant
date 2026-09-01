"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { NetWorthSummary } from "@/components/assets/net-worth-summary";
import { AssetList } from "@/components/assets/asset-list";
import { LiabilityList } from "@/components/assets/liability-list";
import { AddAssetModal } from "@/components/assets/add-asset-modal";
import { AddLiabilityModal } from "@/components/assets/add-liability-modal";
import { Asset, Liability } from "@/lib/types/database";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Gem, Landmark } from "lucide-react";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);

  const fetchAssetsData = useCallback(async () => {
    try {
      // 1. Fetch Assets from Supabase
      const aRes = await fetch("/api/assets");
      if (aRes.ok) {
        const aData = await aRes.json();
        setAssets(aData.assets || []);
      }

      // 2. Fetch Liabilities from Supabase
      const lRes = await fetch("/api/liabilities");
      if (lRes.ok) {
        const lData = await lRes.json();
        setLiabilities(lData.liabilities || []);
      }

      // 3. Fetch Wallets from Supabase for total cash
      const wRes = await fetch("/api/wallets");
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData.wallets) {
          const totalW = wData.wallets.reduce((acc: number, w: any) => acc + Number(w.current_balance || 0), 0);
          setCashBalance(totalW);
        }
      }
    } catch (e) {
      console.error("Error fetching live assets data:", e);
    }
  }, []);

  useEffect(() => {
    fetchAssetsData();
  }, [fetchAssetsData]);

  const totalAssetValue = assets.reduce((acc, curr) => acc + Number(curr.estimated_value || 0), 0);
  const totalLiabilityValue = liabilities.reduce((acc, curr) => acc + Number(curr.remaining_amount || 0), 0);

  const handleAddAsset = async (newAsset: Asset) => {
    setAssets((prev) => [newAsset, ...prev]);
    try {
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });
      fetchAssetsData();
    } catch (err) {
      console.error("Failed to sync asset to Supabase:", err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete asset in Supabase:", err);
    }
  };

  const handleAddLiability = async (newLiability: Liability) => {
    setLiabilities((prev) => [newLiability, ...prev]);
    try {
      await fetch("/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLiability),
      });
      fetchAssetsData();
    } catch (err) {
      console.error("Failed to sync liability to Supabase:", err);
    }
  };

  const handleDeleteLiability = async (id: string) => {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/liabilities?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete liability in Supabase:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      {/* Main Container */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Aset & Liabilitas
            </h1>
            <p className="text-sm text-muted-foreground">
              Pemantauan kekayaan bersih keluarga (Net Worth), kepemilikan aset, dan progres cicilan hutang.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssetModalOpen(true)}
              className="gap-1.5"
            >
              <Gem className="size-4 text-primary" aria-hidden="true" />
              <span>Tambah Aset</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsLiabilityModalOpen(true)}
              className="gap-1.5"
            >
              <Landmark className="size-4" aria-hidden="true" />
              <span>Tambah Hutang</span>
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards for Net Worth */}
        <NetWorthSummary
          totalCash={cashBalance}
          totalAssets={totalAssetValue}
          totalLiabilities={totalLiabilityValue}
        />

        {/* Tabs for Assets vs Liabilities */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="assets">Aset ({assets.length})</TabsTrigger>
            <TabsTrigger value="liabilities">Hutang & Cicilan ({liabilities.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: ALL (Dual Column) */}
          <TabsContent value="all" className="space-y-6">
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
          </TabsContent>

          {/* TAB 2: ASSETS ONLY */}
          <TabsContent value="assets" className="space-y-6">
            <AssetList
              assets={assets}
              onOpenAddModal={() => setIsAssetModalOpen(true)}
              onDeleteAsset={handleDeleteAsset}
            />
          </TabsContent>

          {/* TAB 3: LIABILITIES ONLY */}
          <TabsContent value="liabilities" className="space-y-6">
            <LiabilityList
              liabilities={liabilities}
              onOpenAddModal={() => setIsLiabilityModalOpen(true)}
              onDeleteLiability={handleDeleteLiability}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Tambah Aset */}
      <AddAssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onAddAsset={handleAddAsset}
      />

      {/* Modal Tambah Hutang */}
      <AddLiabilityModal
        isOpen={isLiabilityModalOpen}
        onClose={() => setIsLiabilityModalOpen(false)}
        onAddLiability={handleAddLiability}
      />
    </div>
  );
}
