"use client";

import React, { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetProgress, CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";
import { FinancialCharts } from "@/components/dashboard/financial-charts";
import { WalletsTab } from "@/components/dashboard/wallets-tab";
import { AddTransactionModal } from "@/components/dashboard/add-transaction-modal";
import { ManageBudgetModal } from "@/components/dashboard/manage-budget-modal";
import { ManageCategoriesModal } from "@/components/dashboard/manage-categories-modal";
import { EditBudgetItemModal } from "@/components/dashboard/edit-budget-item-modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import {
  useWallets,
  useCategories,
  useTransactions,
  useBudgets,
  useCurrentUser,
} from "@/lib/hooks/use-family-data";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { user, isAdmin, isSpouse, canManageFinances } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState<CategoryBudgetItem | null>(null);

  // Show friendly notification if redirected due to role restriction
  React.useEffect(() => {
    const accessDenied = searchParams.get("access_denied");
    if (accessDenied) {
      toast.error("Akses Dibatasi: Halaman ini hanya untuk Kepala Keluarga / Pengelola.");
      const nextUrl = window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [searchParams]);

  const activeMonthYear = useMemo(() => {
    return selectedPeriod === "all" ? new Date().toISOString().substring(0, 7) : selectedPeriod;
  }, [selectedPeriod]);

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

  // Business Logic & Aggregated Financial Metrics (Extracted Hook)
  const {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    totalBudget,
    categoryChartData,
    cashFlowHistory,
  } = useDashboardMetrics(wallets, transactions, budgets);

  const refreshAll = () => {
    mutateTransactions();
    mutateWallets();
    mutateCategories();
    mutateBudgets();
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

  return (
    <AppShell onAddTransaction={() => setIsAddModalOpen(true)}>
      <div className="space-y-5 sm:space-y-6 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Modular Page Header & Action Toolbar */}
        <DashboardHeader
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          onRefresh={refreshAll}
          isSyncing={isValidatingTx && !isLoadingTx}
          onAddTransaction={() => setIsAddModalOpen(true)}
        />

        {/* Unified Tabs Navigation */}
        <Tabs defaultValue="overview" className="space-y-5 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="overview">
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="transactions">
              Transaksi ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="budgets">
              Anggaran ({budgets.length})
            </TabsTrigger>
            <TabsTrigger value="wallets">
              Rekening ({wallets.length})
            </TabsTrigger>
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

            {/* Balanced 50%-50% 2-Column Section: Budget Progress & Recent Feed */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <div className="w-full">
                <BudgetProgress
                  budgets={budgets}
                  onOpenManageBudget={canManageFinances ? () => setIsBudgetModalOpen(true) : undefined}
                  onEditItem={canManageFinances ? (item) => setEditingBudgetItem(item) : undefined}
                />
              </div>
              <div className="w-full">
                <TransactionFeed
                  transactions={transactions.slice(0, 5)}
                  onDeleteTransaction={handleDeleteTransaction}
                  enableTooltip={true}
                  currentUser={user}
                  canDeleteAll={isAdmin || isSpouse}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TRANSAKSI LENGKAP */}
          <TabsContent value="transactions" className="space-y-6">
            {isLoadingTx && transactions.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (
              <TransactionFeed
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                enableTooltip={false}
                currentUser={user}
                canDeleteAll={isAdmin || isSpouse}
              />
            )}
          </TabsContent>

          {/* TAB 3: ANGGARAN & ANALISIS */}
          <TabsContent value="budgets" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Pengaturan Pagu Anggaran</h2>
                <p className="text-xs text-muted-foreground">
                  Pantau dan kelola batas pengeluaran keluarga per kategori setiap bulan.
                </p>
              </div>
              {canManageFinances && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsManageCategoriesOpen(true)}
                  className="gap-1.5 h-8 text-xs shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  <span>Kelola Anggaran</span>
                </Button>
              )}
            </div>
            <BudgetProgress
              budgets={budgets}
              onOpenManageBudget={canManageFinances ? () => setIsBudgetModalOpen(true) : undefined}
              onEditItem={canManageFinances ? (item) => setEditingBudgetItem(item) : undefined}
            />
          </TabsContent>

          {/* TAB 4: REKENING & MANAJEMEN DOMPET (ENCAPSULATED) */}
          <TabsContent value="wallets" className="space-y-6">
            <WalletsTab wallets={wallets} onMutate={mutateWallets} canManage={canManageFinances} />
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

      {/* Modal Kelola Kategori Anggaran */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onSuccess={() => {
          mutateCategories();
          mutateBudgets();
          mutateTransactions();
        }}
      />

      {/* Modal Atur Pagu Anggaran Massal (Bulan Aktif) */}
      <ManageBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        activeMonthYear={activeMonthYear}
        budgets={budgets}
        onSaveBudgets={handleSaveBudgets}
        onRefresh={() => {
          mutateBudgets();
          mutateCategories();
        }}
      />

      {/* Modal Edit Anggaran Item (Bulan Aktif) */}
      <EditBudgetItemModal
        isOpen={!!editingBudgetItem}
        onClose={() => setEditingBudgetItem(null)}
        item={editingBudgetItem}
        activeMonthYear={activeMonthYear}
        onSuccess={() => {
          mutateBudgets();
          mutateCategories();
        }}
      />
    </AppShell>
  );
}
