"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetProgress, CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";
import { AddTransactionModal } from "@/components/dashboard/add-transaction-modal";
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
import { Plus, Wallet as WalletIcon, CreditCard } from "lucide-react";

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
  { id: "b-1", name: "Makanan & Minuman", spent: 4850000, target: 6000000 },
  { id: "b-2", name: "Belanja Bulanan", spent: 5120000, target: 6500000 },
  { id: "b-3", name: "Tagihan & Utilitas", spent: 2850000, target: 3500000 },
  { id: "b-4", name: "Transport & Bensin", spent: 1500000, target: 2000000 },
  { id: "b-5", name: "Kesehatan & Anak", spent: 450000, target: 1500000 },
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

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.log("Using preview transactions.");
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Top Navbar */}
      <Navbar onOpenAddModal={() => setIsAddModalOpen(true)} familyName="Keluarga F&R" />

      {/* Main Container */}
      <main className="flex-1 flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Dashboard Finansial
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Pencatatan arus kas, alokasi anggaran bulanan, dan saldo rekening keluarga terpadu.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-10 w-[150px] text-xs font-semibold rounded-full">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
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
              size="sm"
              className="h-10 gap-1.5 text-xs font-semibold px-4 rounded-full"
            >
              <Plus className="size-4" />
              <span>Catat Transaksi</span>
            </Button>
          </div>
        </div>

        {/* Flat Rounded Tabs Navigation */}
        <Tabs defaultValue="overview" className="flex flex-col gap-6">
          <TabsList className="grid w-full grid-cols-4 sm:w-[440px] rounded-full">
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="transactions">Transaksi</TabsTrigger>
            <TabsTrigger value="budgets">Anggaran</TabsTrigger>
            <TabsTrigger value="wallets">Rekening</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="flex flex-col gap-6">
            {/* 4 Summary Cards */}
            <SummaryCards
              totalBalance={totalBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpense={monthlyExpense}
              totalBudget={totalBudget}
            />

            {/* 2-Column Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              {/* Left 4 Cols: Live Transactions Feed */}
              <div className="lg:col-span-4">
                <TransactionFeed
                  transactions={filteredByPeriodTransactions}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </div>

              {/* Right 3 Cols: Budgets & Wallets */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <BudgetProgress budgets={budgets} />

                {/* Wallets Card */}
                <Card className="rounded-2xl border-slate-200/80 bg-white">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Rekening & Dompet Aktif
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2.5 bg-slate-50 rounded-full">
                        {wallets.length} Akun
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Saldo kas terdaftar per rekening keluarga
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 p-5 pt-3">
                    {wallets.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <CreditCard className="size-4" />
                          </div>
                          <span className="font-semibold text-slate-800">{w.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">
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
          <TabsContent value="transactions" className="flex flex-col gap-4">
            <TransactionFeed
              transactions={filteredByPeriodTransactions}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </TabsContent>

          {/* TAB 3: BUDGETS */}
          <TabsContent value="budgets" className="flex flex-col gap-4">
            <BudgetProgress budgets={budgets} />
          </TabsContent>

          {/* TAB 4: WALLETS */}
          <TabsContent value="wallets" className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {wallets.map((w) => (
                <Card key={w.id} className="rounded-2xl border-slate-200/80 bg-white">
                  <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {w.name}
                    </CardTitle>
                    <div className="flex size-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <CreditCard className="size-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-1">
                    <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {formatRupiah(w.current_balance)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold">Tipe: {w.type}</p>
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
    </div>
  );
}
