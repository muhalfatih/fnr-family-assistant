"use client";

import { useMemo } from "react";
import { Wallet, Transaction } from "@/lib/types/database";
import { CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { MonthlyFlowData } from "@/components/dashboard/financial-charts";

export interface DashboardMetrics {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalBudget: number;
  categoryChartData: {
    name: string;
    value: number;
    color: string;
  }[];
  cashFlowHistory: MonthlyFlowData[];
}

const CATEGORY_COLOR_PALETTE = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
];

export function useDashboardMetrics(
  wallets: Wallet[] = [],
  transactions: Transaction[] = [],
  budgets: CategoryBudgetItem[] = []
): DashboardMetrics {
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

    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: CATEGORY_COLOR_PALETTE[i % CATEGORY_COLOR_PALETTE.length],
    }));
  }, [transactions]);

  // 4. Calculate Dynamic 6-Month Cashflow History
  const cashFlowHistory = useMemo((): MonthlyFlowData[] => {
    const monthsMap: Record<string, { income: number; expense: number; label: string }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short" });
      monthsMap[key] = { income: 0, expense: 0, label };
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

    return Object.entries(monthsMap).map(([_, val]) => ({
      month: val.label,
      income: val.income,
      expense: val.expense,
    }));
  }, [transactions]);

  // 5. Total Planned Budget
  const totalBudget = useMemo(() => {
    return budgets.reduce((acc, b) => acc + (b.target || 0), 0);
  }, [budgets]);

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    totalBudget,
    categoryChartData,
    cashFlowHistory,
  };
}
