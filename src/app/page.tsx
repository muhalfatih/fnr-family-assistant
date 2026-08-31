"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetProgress, CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";
import { FinancialCharts } from "@/components/dashboard/financial-charts";
import { AddTransactionModal } from "@/components/dashboard/add-transaction-modal";
import { ManageWalletModal } from "@/components/dashboard/manage-wallet-modal";
import { ManageBudgetModal } from "@/components/dashboard/manage-budget-modal";
import { Transaction, Wallet, Category } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { Plus, CreditCard, PlusCircle } from "lucide-react";

// Fallback initial data
const INITIAL_WALLETS: Wallet[] = [
  {
    id: "w-1",
    family_id: "fam-1",
    name: "BCA Utama (Ayah)",
    type: "bank",
    current_balance: 24500000,
    currency: "IDR",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "w-2",
    family_id: "fam-1",
    name: "Mandiri Operasional (Ibu)",
    type: "bank",
    current_balance: 14850000,
    currency: "IDR",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "w-3",
    family_id: "fam-1",
    name: "Gopay / QRIS",
    type: "ewallet",
    current_balance: 1250000,
    currency: "IDR",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "w-4",
    family_id: "fam-1",
    name: "Dompet Tunai (Cash)",
    type: "cash",
    current_balance: 2250000,
    currency: "IDR",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: "c-1", family_id: "fam-1", name: "Makanan & Minuman", type: "expense", is_default: true, created_at: "" },
  { id: "c-2", family_id: "fam-1", name: "Belanja Bulanan", type: "expense", is_default: true, created_at: "" },
  { id: "c-3", family_id: "fam-1", name: "Transportasi & Bensin", type: "expense", is_default: true, created_at: "" },
  { id: "c-4", family_id: "fam-1", name: "Tagihan & Utilitas", type: "expense", is_default: true, created_at: "" },
  { id: "c-5", family_id: "fam-1", name: "Kesehatan & Anak", type: "expense", is_default: true, created_at: "" },
  { id: "c-6", family_id: "fam-1", name: "Gaji & Pendapatan", type: "income", is_default: true, created_at: "" },
];

const INITIAL_BUDGETS: CategoryBudgetItem[] = [
  { id: "b-1", name: "Makanan & Minuman", spent: 4850000, target: 6000000, color: "#3b82f6" },
  { id: "b-2", name: "Belanja Bulanan", spent: 5120000, target: 6500000, color: "#10b981" },
  { id: "b-3", name: "Tagihan & Utilitas", spent: 2850000, target: 3500000, color: "#f59e0b" },
  { id: "b-4", name: "Transport & Bensin", spent: 1500000, target: 2000000, color: "#8b5cf6" },
  { id: "b-5", name: "Kesehatan & Anak", spent: 450000, target: 1500000, color: "#ec4899" },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    family_id: "fam-1",
    type: "expense",
    amount: 55000,
    description: "Belanja Susu UHT & Roti",
    transaction_date: "2026-08-31T08:30:00.000Z",
    media_type: "image",
    is_synced_gsheet: true,
    wallet_id: "w-1",
    wallet: INITIAL_WALLETS[0],
    category_id: "c-2",
    category: INITIAL_CATEGORIES[1],
    member: { id: "m-1", family_id: "fam-1", full_name: "Ayah", role: "admin", created_at: "" },
    parsed_metadata: {
      merchant: "Indomaret Point",
      confidence: 0.98,
      items: [
        { name: "Susu UHT 1L", qty: 2, price: 19500 },
        { name: "Roti Tawar Gandum", qty: 1, price: 16000 },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "tx-2",
    family_id: "fam-1",
    type: "expense",
    amount: 150000,
    description: "Bensin Mobil Shell V-Power",
    transaction_date: "2026-08-30T10:15:00.000Z",
    media_type: "audio",
    is_synced_gsheet: true,
    wallet_id: "w-1",
    wallet: INITIAL_WALLETS[0],
    category_id: "c-3",
    category: INITIAL_CATEGORIES[2],
    member: { id: "m-1", family_id: "fam-1", full_name: "Ayah", role: "admin", created_at: "" },
    parsed_metadata: {
      transcription: "Tadi isi bensin shell seratus lima puluh ribu pakai BCA",
      confidence: 0.95,
      items: [],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "tx-3",
    family_id: "fam-1",
    type: "expense",
    amount: 85000,
    description: "Tagihan PDAM Air Bersih",
    transaction_date: "2026-08-28T09:00:00.000Z",
    media_type: "text",
    is_synced_gsheet: true,
    wallet_id: "w-3",
    wallet: INITIAL_WALLETS[2],
    category_id: "c-4",
    category: INITIAL_CATEGORIES[3],
    member: { id: "m-2", family_id: "fam-1", full_name: "Ibu", role: "admin", created_at: "" },
    parsed_metadata: { items: [] },
    created_at: new Date().toISOString(),
  },
  {
    id: "tx-4",
    family_id: "fam-1",
    type: "income",
    amount: 25000000,
    description: "Gaji Bulanan",
    transaction_date: "2026-08-25T07:00:00.000Z",
    media_type: "text",
    is_synced_gsheet: true,
    wallet_id: "w-1",
    wallet: INITIAL_WALLETS[0],
    category_id: "c-6",
    category: INITIAL_CATEGORIES[5],
    member: { id: "m-1", family_id: "fam-1", full_name: "Ayah", role: "admin", created_at: "" },
    parsed_metadata: { items: [] },
    created_at: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [budgets, setBudgets] = useState<CategoryBudgetItem[]>(INITIAL_BUDGETS);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-08");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Filter transactions by selected period
  const filteredByPeriodTransactions = transactions.filter((t) => {
    if (selectedPeriod === "all") return true;
    return t.transaction_date.startsWith(selectedPeriod);
  });

  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.current_balance), 0);
  
  // Aggregate real expenditure from category budgets + active transactions
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const monthlyExpense = totalBudgetSpent > 0 
    ? totalBudgetSpent 
    : filteredByPeriodTransactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0);

  const monthlyIncome = filteredByPeriodTransactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + Number(t.amount), 0) || 25000000;

  const totalBudget = budgets.reduce((acc, b) => acc + b.target, 0);

  const categoryPieData = budgets.map((b) => ({
    name: b.name,
    value: b.spent,
    color: b.color || "#3b82f6",
  }));

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        const data = await jsonResponse(res);
        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.log("Using preview transactions.");
    }
  };

  const jsonResponse = async (res: Response) => {
    return await res.json();
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddWallet = (newWallet: Wallet) => {
    setWallets((prev) => [...prev, newWallet]);
  };

  const handleSaveBudgets = (updatedBudgets: CategoryBudgetItem[]) => {
    setBudgets(updatedBudgets);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      {/* Main Container with Standard Shadcn Dashboard Layout */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Pusat kendali keuangan, analitik arus kas, dan saldo rekening keluarga.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[145px]" aria-label="Filter Periode Bulan">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="2026-08">Agustus 2026</SelectItem>
                  <SelectItem value="2026-07">Juli 2026</SelectItem>
                  <SelectItem value="2026-06">Juni 2026</SelectItem>
                  <SelectItem value="all">Semua Periode</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Catat Transaksi</span>
            </Button>
          </div>
        </div>

        {/* Canonical Shadcn Tabs Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="transactions">Transaksi</TabsTrigger>
            <TabsTrigger value="budgets">Anggaran & Analisis</TabsTrigger>
            <TabsTrigger value="wallets">Rekening</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            {/* 4 Summary Cards */}
            <SummaryCards
              totalBalance={totalBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpense={monthlyExpense}
              totalBudget={totalBudget}
            />

            {/* Financial Visual Charts */}
            <FinancialCharts categoryData={categoryPieData} />

            {/* Standard Shadcn 7-Column Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              {/* Left 4 Cols: Live Transactions Feed */}
              <div className="col-span-4">
                <TransactionFeed
                  transactions={filteredByPeriodTransactions}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </div>

              {/* Right 3 Cols: Budgets & Wallets */}
              <div className="col-span-3 space-y-6">
                <BudgetProgress
                  budgets={budgets}
                  onOpenManageBudget={() => setIsBudgetModalOpen(true)}
                />

                {/* Wallets Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>Rekening & Dompet</CardTitle>
                        <Badge variant="outline" className="text-xs font-normal">
                          {wallets.length} Akun
                        </Badge>
                      </div>
                      <CardDescription>
                        Saldo kas terdaftar per rekening keluarga
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsWalletModalOpen(true)}
                      className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <PlusCircle className="size-3.5" aria-hidden="true" />
                      <span>Tambah</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-2.5">
                    {wallets.map((w) => (
                      <div
                        key={w.id}
                        className="p-3 rounded-lg border bg-muted/40 hover:bg-muted/70 transition-colors flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background border text-foreground">
                            <CreditCard className="size-4" aria-hidden="true" />
                          </div>
                          <span className="font-medium truncate">{w.name}</span>
                        </div>
                        <span className="font-medium tabular-nums shrink-0">
                          {formatRupiah(w.current_balance)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TRANSACTIONS */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="max-w-4xl w-full">
              <TransactionFeed
                transactions={filteredByPeriodTransactions}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>
          </TabsContent>

          {/* TAB 3: BUDGETS & ANALYTICS */}
          <TabsContent value="budgets" className="space-y-6">
            <FinancialCharts categoryData={categoryPieData} />
            <div className="max-w-4xl w-full">
              <BudgetProgress
                budgets={budgets}
                onOpenManageBudget={() => setIsBudgetModalOpen(true)}
              />
            </div>
          </TabsContent>

          {/* TAB 4: WALLETS */}
          <TabsContent value="wallets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Daftar Rekening & Dompet</h2>
                <p className="text-xs text-muted-foreground">Kelola rekening bank, e-wallet, dan instrumen saldo kas keluarga.</p>
              </div>
              <Button onClick={() => setIsWalletModalOpen(true)} size="sm" className="gap-1.5">
                <Plus className="size-4" aria-hidden="true" />
                <span>Tambah Rekening</span>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {wallets.map((w) => (
                <Card key={w.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate">
                      {w.name}
                    </CardTitle>
                    <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums truncate">
                      {formatRupiah(w.current_balance)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 uppercase font-medium">Tipe: {w.type}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Catat Transaksi */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        wallets={wallets}
        categories={categories}
        onSuccess={fetchTransactions}
      />

      {/* Modal Tambah Rekening */}
      <ManageWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onAddWallet={handleAddWallet}
      />

      {/* Modal Atur Pagu Anggaran */}
      <ManageBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgets={budgets}
        onSaveBudgets={handleSaveBudgets}
      />
    </div>
  );
}
