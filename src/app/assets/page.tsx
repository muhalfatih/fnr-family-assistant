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

// Fallback Initial Assets & Liabilities Data
const INITIAL_ASSETS: Asset[] = [
  {
    id: "a-1",
    family_id: "fam-1",
    name: "Rumah Tinggal (Cinere)",
    category: "real_estate",
    estimated_value: 1250000000,
    acquisition_date: "2021-06-15",
    notes: "Sertifikat Hak Milik (SHM) No. 4512",
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "a-2",
    family_id: "fam-1",
    name: "Logam Mulia Antam (Certicard)",
    category: "gold",
    estimated_value: 145000000,
    acquisition_date: "2023-01-10",
    notes: "Total 100 gram @ Brankas Pribadi",
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "a-3",
    family_id: "fam-1",
    name: "Honda HR-V Prestige 2022",
    category: "vehicle",
    estimated_value: 340000000,
    acquisition_date: "2022-09-20",
    notes: "Atas nama Ayah, Pajak Sept",
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: "a-4",
    family_id: "fam-1",
    name: "Portofolio Reksadana & SBN (Bibit)",
    category: "investment",
    estimated_value: 85000000,
    acquisition_date: "2024-03-01",
    notes: "Obligasi FR0080 & Reksadana Pasar Uang",
    metadata: {},
    created_at: new Date().toISOString(),
  },
];

const INITIAL_LIABILITIES: Liability[] = [
  {
    id: "l-1",
    family_id: "fam-1",
    name: "KPR Bank BTN (Rumah Cinere)",
    type: "mortgage",
    total_amount: 800000000,
    remaining_amount: 420000000,
    monthly_installment: 7850000,
    due_date_day: 10,
    created_at: new Date().toISOString(),
  },
  {
    id: "l-2",
    family_id: "fam-1",
    name: "Cicilan OTO Finance (Honda HR-V)",
    type: "vehicle_loan",
    total_amount: 180000000,
    remaining_amount: 45000000,
    monthly_installment: 4500000,
    due_date_day: 25,
    created_at: new Date().toISOString(),
  },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [liabilities, setLiabilities] = useState<Liability[]>(INITIAL_LIABILITIES);
  const [cashBalance, setCashBalance] = useState<number>(42850000);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);

  const fetchAssetsData = useCallback(async () => {
    try {
      // 1. Fetch Assets from Supabase
      const aRes = await fetch("/api/assets");
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.assets && aData.assets.length > 0) {
          setAssets(aData.assets);
        }
      }

      // 2. Fetch Liabilities from Supabase
      const lRes = await fetch("/api/liabilities");
      if (lRes.ok) {
        const lData = await lRes.json();
        if (lData.liabilities && lData.liabilities.length > 0) {
          setLiabilities(lData.liabilities);
        }
      }

      // 3. Fetch Wallets from Supabase for total cash
      const wRes = await fetch("/api/wallets");
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData.wallets && wData.wallets.length > 0) {
          const totalW = wData.wallets.reduce((acc: number, w: any) => acc + Number(w.current_balance || 0), 0);
          setCashBalance(totalW);
        }
      }
    } catch (e) {
      console.log("Using preview assets data.");
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
