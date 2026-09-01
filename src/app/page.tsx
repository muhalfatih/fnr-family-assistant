"use client";

import React, { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";
import { FinancialCharts, MonthlyFlowData } from "@/components/dashboard/financial-charts";
import { AddTransactionModal } from "@/components/dashboard/add-transaction-modal";
import { ManageWalletModal } from "@/components/dashboard/manage-wallet-modal";
import { ManageBudgetModal } from "@/components/dashboard/manage-budget-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  TrendingUp,
  Pencil,
  Trash2,
  WalletCards,
  RefreshCw,
} from "lucide-react";
import { Wallet } from "@/lib/types/database";
import {
  useWallets,
  useCategories,
  useTransactions,
  useBudgets,
} from "@/lib/hooks/use-family-data";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // SWR Caching & Real-time Auto-sync Hooks
  const { wallets, mutate: mutateWallets } = useWallets();
  const { categories, mutate: mutateCategories } = useCategories();
  const {
    transactions,
    isLoading: isLoadingTx,
    isValidating: isValidatingTx,
    mutate: mutateTransactions,
  } = useTransactions(selectedPeriod);
  const { budgets, mutate: mutateBudgets } = useBudgets(selectedPeriod);

  const refreshAll = () => {
    mutateTransactions();
    mutateWallets();
    mutateCategories();
    mutateBudgets();
  };

  // 1. Calculate Real Cash Summary
  const totalBalance = useMemo(() => {
    return wallets.reduce((acc, w) => acc + Number(w.current_balance || 0), 0);
  }, [wallets]);

  // 2. Calculate Monthly Flow (Income vs Expense)
  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") inc += amt;
      if (t.type === "expense") exp += amt;
    });
    return { monthlyIncome: inc, monthlyExpense: exp };
  }, [transactions]);

  // 3. Calculate Category Breakdown for Charts
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const catName = t.category?.name || "Lain-lain";
        map[catName] = (map[catName] || 0) + Number(t.amount || 0);
      });

    const palette = [
      "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
      "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
    ];

    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length],
    }));
  }, [transactions]);

  // 4. Calculate Dynamic 6-Month Cashflow History
  const cashFlowHistory = useMemo((): MonthlyFlowData[] => {
    const monthsMap: Record<string, { income: number; expense: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short" });
      monthsMap[key] = { income: 0, expense: 0 };
      (monthsMap[key] as any).label = label;
    }

    transactions.forEach((t) => {
      const dateStr = t.transaction_date || t.created_at;
      if (!dateStr) return;
      const key = dateStr.substring(0, 7);
      if (monthsMap[key]) {
        const amt = Number(t.amount || 0);
        if (t.type === "income") monthsMap[key].income += amt;
        if (t.type === "expense") monthsMap[key].expense += amt;
      }
    });

    return Object.entries(monthsMap).map(([_, val]: any) => ({
      month: val.label,
      income: val.income,
      expense: val.expense,
    }));
  }, [transactions]);

  // 5. Total Planned Budget
  const totalBudget = useMemo(() => {
    return budgets.reduce((acc, b) => acc + (b.target || 0), 0);
  }, [budgets]);

  // Wallet Actions
  const handleOpenAddWallet = () => {
    setWalletToEdit(null);
    setIsWalletModalOpen(true);
  };

  const handleOpenEditWallet = (wallet: Wallet) => {
    setWalletToEdit(wallet);
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = async (walletData: Partial<Wallet>, isEdit: boolean) => {
    try {
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch("/api/wallets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walletData),
      });
      if (res.ok) {
        mutateWallets();
      }
    } catch (err) {
      console.error("Failed to save wallet:", err);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    try {
      const res = await fetch(`/api/wallets?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutateWallets();
        setWalletToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete wallet:", err);
    }
  };

  const handleSaveBudgets = async (targetMonthYear: string, updatedBudgets: any[]) => {
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthYear: targetMonthYear,
          budgets: updatedBudgets.map((b) => ({
            categoryId: b.category_id || b.id.replace("cat-", ""),
            targetAmount: Number(b.target || 0),
          })),
        }),
      });
      if (res.ok) {
        mutateBudgets();
      }
    } catch (err) {
      console.error("Failed to save budgets:", err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutateTransactions();
        mutateWallets();
        mutateBudgets();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "bank":
        return <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />;
      case "ewallet":
        return <Smartphone className="size-4 text-muted-foreground" aria-hidden="true" />;
      case "cash":
        return <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />;
      case "investment":
        return <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />;
      default:
        return <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  return (
    <AppShell onAddTransaction={() => setIsAddModalOpen(true)}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <WalletCards className="size-6 text-foreground shrink-0" aria-hidden="true" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                Keuangan & Arus Kas
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Pusat kendali keuangan, analitik arus kas, dan saldo rekening keluarga.
              </p>
              {isValidatingTx && !isLoadingTx && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sync</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-auto min-w-[150px] h-8 text-xs px-2.5 rounded-md" aria-label="Filter Periode Bulan">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all" className="text-xs">Semua Periode</SelectItem>
                  <SelectItem value="2026-12" className="text-xs">Desember 2026 (Mendatang)</SelectItem>
                  <SelectItem value="2026-11" className="text-xs">November 2026 (Mendatang)</SelectItem>
                  <SelectItem value="2026-10" className="text-xs">Oktober 2026 (Mendatang)</SelectItem>
                  <SelectItem value="2026-09" className="text-xs font-semibold">September 2026 (Bulan Ini)</SelectItem>
                  <SelectItem value="2026-08" className="text-xs">Agustus 2026</SelectItem>
                  <SelectItem value="2026-07" className="text-xs">Juli 2026</SelectItem>
                  <SelectItem value="2026-06" className="text-xs">Juni 2026</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              className="gap-1.5 h-8 text-xs px-2.5 rounded-md"
              title="Segarkan data sekarang"
            >
              <RefreshCw className={`size-3.5 ${isValidatingTx ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 h-8 text-xs px-3 rounded-md shadow-sm"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Catat Transaksi</span>
            </Button>
          </div>
        </div>

        {/* Canonical Shadcn Tabs Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border border-border/50">
            <TabsTrigger value="overview" className="text-xs">Ringkasan</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs">Transaksi ({transactions.length})</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs">Anggaran & Analisis</TabsTrigger>
            <TabsTrigger value="wallets" className="text-xs">Rekening ({wallets.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            {isLoadingTx && transactions.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[106px] rounded-xl" />
                ))}
              </div>
            ) : (
              <SummaryCards
                totalBalance={totalBalance}
                monthlyIncome={monthlyIncome}
                monthlyExpense={monthlyExpense}
                totalBudget={totalBudget}
              />
            )}

            {/* Financial Visualizations: Balanced 50%-50% Grid */}
            {isLoadingTx && transactions.length === 0 ? (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Skeleton className="h-[360px] rounded-xl" />
                <Skeleton className="h-[360px] rounded-xl" />
              </div>
            ) : (
              <FinancialCharts
                cashFlowData={cashFlowHistory}
                categoryData={categoryChartData}
              />
            )}

            {/* Balanced 50%-50% 2-Column Section: Budget Progress (50%) & Recent Feed (50%) */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <div className="w-full">
                <BudgetProgress
                  budgets={budgets}
                  onOpenManageBudget={() => setIsBudgetModalOpen(true)}
                />
              </div>
              <div className="w-full">
                <TransactionFeed
                  transactions={transactions.slice(0, 5)}
                  onDeleteTransaction={handleDeleteTransaction}
                  enableTooltip={true}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TRANSAKSI */}
          <TabsContent value="transactions">
            {isLoadingTx && transactions.length === 0 ? (
              <Skeleton className="h-[400px] rounded-xl" />
            ) : (
              <TransactionFeed
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                enableTooltip={false}
              />
            )}
          </TabsContent>

          {/* TAB 3: ANGGARAN & ANALISIS */}
          <TabsContent value="budgets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Pengaturan Pagu Anggaran</h2>
                <p className="text-xs text-muted-foreground">
                  Pantau dan kelola batas pengeluaran keluarga per kategori setiap bulan.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBudgetModalOpen(true)}
                className="gap-1.5 h-8 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Atur Pagu Anggaran</span>
              </Button>
            </div>
            <BudgetProgress
              budgets={budgets}
              onOpenManageBudget={() => setIsBudgetModalOpen(true)}
            />
          </TabsContent>

          {/* TAB 4: REKENING & MANAJEMEN DOMPET */}
          <TabsContent value="wallets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Rekening & Dompet Kas</h2>
                <p className="text-xs text-muted-foreground">
                  Daftar seluruh rekening bank, e-wallet, dan dompet fisik keluarga. Anda dapat menambah, mengubah, atau menghapus akun.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddWallet}
                className="gap-1.5 h-8 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Tambah Rekening</span>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wallets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl border-dashed">
                  <CreditCard className="size-8 mx-auto mb-2 text-muted-foreground/60" aria-hidden="true" />
                  <p className="text-xs font-medium">Belum ada rekening terdaftar</p>
                  <p className="text-[11px] mt-1 text-muted-foreground">Tambahkan rekening bank, e-wallet, atau dompet tunai pertama Anda.</p>
                </div>
              ) : (
                wallets.map((w) => (
                  <Card key={w.id} className="rounded-xl border border-border/80 bg-card hover:border-border transition-all flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
                      <div className="space-y-1 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate text-foreground">
                            {w.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 shrink-0">
                            {w.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {w.account_number && w.account_number !== "-" ? w.account_number : "Kas Pribadi"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getWalletIcon(w.type)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 border-t border-border/50 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                          Saldo Saat Ini
                        </span>
                        <div className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
                          {formatRupiah(w.current_balance)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditWallet(w)}
                          className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                          title="Edit Rekening"
                          aria-label={`Edit rekening ${w.name}`}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWalletToDelete(w)}
                          className="size-7 text-muted-foreground hover:text-destructive rounded-md"
                          title="Hapus Rekening"
                          aria-label={`Hapus rekening ${w.name}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Catat Transaksi */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        wallets={wallets}
        categories={categories}
        onSuccess={refreshAll}
      />

      {/* Modal Tambah / Edit Rekening */}
      <ManageWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        walletToEdit={walletToEdit}
        onSaveWallet={handleSaveWallet}
      />

      {/* Modal Atur Pagu Anggaran */}
      <ManageBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        initialMonthYear={selectedPeriod === "all" ? "2026-09" : selectedPeriod}
        budgets={budgets}
        onSaveBudgets={handleSaveBudgets}
      />

      {/* Delete Wallet Alert Dialog */}
      <AlertDialog open={!!walletToDelete} onOpenChange={(open) => !open && setWalletToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Rekening Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Rekening <strong className="text-foreground font-semibold">{walletToDelete?.name}</strong> dengan saldo saat ini{" "}
              <strong className="text-foreground font-semibold">
                {walletToDelete ? formatRupiah(walletToDelete.current_balance) : ""}
              </strong>{" "}
              akan dihapus dari daftar rekening kas keluarga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 text-xs px-3">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => walletToDelete && handleDeleteWallet(walletToDelete.id)}
              className="h-9 text-xs px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Rekening
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
