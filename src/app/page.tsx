"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetProgress, CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";
import { FinancialCharts, MonthlyFlowData } from "@/components/dashboard/financial-charts";
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

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudgetItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Fetch Live Data from Supabase Endpoints
  const fetchAllData = useCallback(async () => {
    try {
      // 1. Fetch Transactions from Supabase
      const txRes = await fetch("/api/transactions");
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }

      // 2. Fetch Wallets from Supabase
      const wRes = await fetch("/api/wallets");
      if (wRes.ok) {
        const wData = await wRes.json();
        setWallets(wData.wallets || []);
      }

      // 3. Fetch Categories from Supabase
      const cRes = await fetch("/api/categories");
      if (cRes.ok) {
        const cData = await cRes.json();
        setCategories(cData.categories || []);
      }

      // 4. Fetch Budgets from Supabase
      const bRes = await fetch(`/api/budgets?period=${selectedPeriod === "all" ? "2026-09" : selectedPeriod}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBudgets(bData.budgets || []);
      }
    } catch (e) {
      console.error("Error fetching live data:", e);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filter transactions by selected period
  const filteredByPeriodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedPeriod === "all") return true;
      return t.transaction_date.startsWith(selectedPeriod);
    });
  }, [transactions, selectedPeriod]);

  // Purely computed live metrics from Supabase
  const totalBalance = useMemo(() => {
    return wallets.reduce((acc, w) => acc + Number(w.current_balance || 0), 0);
  }, [wallets]);

  const monthlyExpense = useMemo(() => {
    return filteredByPeriodTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  }, [filteredByPeriodTransactions]);

  const monthlyIncome = useMemo(() => {
    return filteredByPeriodTransactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  }, [filteredByPeriodTransactions]);

  const totalBudget = useMemo(() => {
    return budgets.reduce((acc, b) => acc + Number(b.target || 0), 0);
  }, [budgets]);

  // Compute live Donut Chart data strictly from budgets/transactions
  const categoryPieData = useMemo(() => {
    return budgets
      .filter((b) => b.spent > 0)
      .map((b) => ({
        name: b.name,
        value: Number(b.spent || 0),
        color: b.color || "#3b82f6",
      }));
  }, [budgets]);

  // Compute dynamic Cash Flow Bar Chart data from actual transactions
  const cashFlowData = useMemo<MonthlyFlowData[]>(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const flowMap: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((tx) => {
      const d = new Date(tx.transaction_date);
      const key = `${monthNames[d.getMonth()]}`;
      if (!flowMap[key]) {
        flowMap[key] = { income: 0, expense: 0 };
      }
      if (tx.type === "income") {
        flowMap[key].income += Number(tx.amount || 0);
      } else if (tx.type === "expense") {
        flowMap[key].expense += Number(tx.amount || 0);
      }
    });

    const entries = Object.entries(flowMap);
    if (entries.length === 0) {
      return [];
    }

    return entries.map(([month, val]) => ({
      month,
      income: val.income,
      expense: val.expense,
    }));
  }, [transactions]);

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddWallet = async (newWallet: Wallet) => {
    setWallets((prev) => [...prev, newWallet]);
    try {
      await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWallet),
      });
      fetchAllData();
    } catch (err) {
      console.error("Failed to sync wallet to Supabase:", err);
    }
  };

  const handleSaveBudgets = async (updatedBudgets: CategoryBudgetItem[]) => {
    setBudgets(updatedBudgets);
    try {
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: updatedBudgets,
          monthYear: selectedPeriod === "all" ? "2026-09" : selectedPeriod,
        }),
      });
      fetchAllData();
    } catch (err) {
      console.error("Failed to sync budgets to Supabase:", err);
    }
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
              <SelectTrigger className="w-[155px]" aria-label="Filter Periode Bulan">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua Periode</SelectItem>
                  <SelectItem value="2026-09">September 2026</SelectItem>
                  <SelectItem value="2026-08">Agustus 2026</SelectItem>
                  <SelectItem value="2026-07">Juli 2026</SelectItem>
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
            <TabsTrigger value="transactions">Transaksi ({transactions.length})</TabsTrigger>
            <TabsTrigger value="budgets">Anggaran & Analisis</TabsTrigger>
            <TabsTrigger value="wallets">Rekening ({wallets.length})</TabsTrigger>
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
            <FinancialCharts
              cashFlowData={cashFlowData}
              categoryData={categoryPieData}
            />

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
                    {wallets.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        <p>Belum ada rekening terdaftar di Supabase.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsWalletModalOpen(true)}
                          className="mt-2 text-xs h-7 gap-1"
                        >
                          <Plus className="size-3" aria-hidden="true" />
                          <span>Daftarkan Rekening Pertama</span>
                        </Button>
                      </div>
                    ) : (
                      wallets.map((w) => (
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
                      ))
                    )}
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
            <FinancialCharts
              cashFlowData={cashFlowData}
              categoryData={categoryPieData}
            />
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
              {wallets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground border rounded-lg">
                  <CreditCard className="size-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                  <p className="font-medium">Belum ada rekening kas.</p>
                  <p className="text-xs mt-1">Tambahkan rekening bank, e-wallet, atau dompet tunai pertama Anda.</p>
                </div>
              ) : (
                wallets.map((w) => (
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
                ))
              )}
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
        onSuccess={fetchAllData}
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
