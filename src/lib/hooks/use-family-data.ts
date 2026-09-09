"use client";

import useSWR, { SWRConfiguration } from "swr";
import { Transaction, Wallet, Category } from "@/lib/types/database";
import { CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { VaultDocument } from "@/app/api/documents/route";

// Standard JSON fetcher for SWR
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Gagal mengambil data dari server");
  }
  return res.json();
};

// Global default configuration for family data
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: true, // Revalidate when user returns to browser tab
  dedupingInterval: 8000,   // Deduplicate requests within 8 seconds
  refreshInterval: 0,       // Event-driven realtime updates via Supabase WebSocket (no periodic polling)
  revalidateOnReconnect: true,
  keepPreviousData: true,   // ZERO-FLICKER: keep previous data in view while revalidating
};

// 1. Wallets hook
export function useWallets() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ wallets: Wallet[] }>(
    "/api/wallets",
    fetcher,
    defaultConfig
  );

  return {
    wallets: data?.wallets || [],
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 2. Categories hook
export function useCategories() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ categories: Category[] }>(
    "/api/categories",
    fetcher,
    defaultConfig
  );

  return {
    categories: data?.categories || [],
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 3. Transactions hook
export function useTransactions(period = "all") {
  const url = `/api/transactions?period=${encodeURIComponent(period)}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    transactions: Transaction[];
    monthYear?: string;
  }>(url, fetcher, defaultConfig);

  return {
    transactions: data?.transactions || [],
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 4. Budgets hook
export function useBudgets(period?: string) {
  const monthYear = period && period !== "all" ? period : new Date().toISOString().substring(0, 7);
  const url = `/api/budgets?monthYear=${encodeURIComponent(monthYear)}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    budgets: CategoryBudgetItem[];
    monthlyTotalExpense: number;
    monthlyTotalIncome: number;
  }>(url, fetcher, defaultConfig);

  return {
    budgets: data?.budgets || [],
    monthlyTotalExpense: data?.monthlyTotalExpense || 0,
    monthlyTotalIncome: data?.monthlyTotalIncome || 0,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 5. Assets hook
export function useAssets() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ assets: any[] }>(
    "/api/assets",
    fetcher,
    defaultConfig
  );

  return {
    assets: data?.assets || [],
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 6. Liabilities hook
export function useLiabilities() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ liabilities: any[] }>(
    "/api/liabilities",
    fetcher,
    defaultConfig
  );

  return {
    liabilities: data?.liabilities || [],
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 7. Documents (Vault) hook
export function useDocuments() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ documents: VaultDocument[] }>(
    "/api/documents",
    fetcher,
    defaultConfig
  );

  return {
    documents: data?.documents || [],
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 8. Family Members hook
export function useFamilyMembers(period?: string) {
  const url = period ? `/api/members?period=${encodeURIComponent(period)}` : "/api/members";
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    members: any[];
    unassignedSpent: number;
  }>(url, fetcher, defaultConfig);

  return {
    members: data?.members || [],
    unassignedSpent: data?.unassignedSpent || 0,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 9. Family Contributions hook
export function useFamilyContributions(period?: string) {
  const url = period
    ? `/api/members/contributions?period=${encodeURIComponent(period)}`
    : "/api/members/contributions";
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    contributions: any[];
    totalExpense: number;
    unassigned: any;
  }>(url, fetcher, defaultConfig);

  return {
    contributions: data?.contributions || [],
    totalExpense: data?.totalExpense || 0,
    unassigned: data?.unassigned || null,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// 10. Chat Logs hook
export function useChatLogs() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ logs: any[]; isMockMode?: boolean }>(
    "/api/logs",
    fetcher,
    defaultConfig
  );

  return {
    logs: data?.logs || [],
    isMockMode: Boolean(data?.isMockMode),
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

export interface CurrentUserSession {
  id?: string;
  name?: string;
  email?: string;
  role?: "admin" | "spouse" | "member";
  loginAt?: string;
}

// 11. Current User / RBAC Hook
export function useCurrentUser() {
  const { data, error, isLoading, mutate } = useSWR<{
    authenticated: boolean;
    user: CurrentUserSession | null;
  }>("/api/auth/me", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });

  const user = data?.user || null;
  const role = user?.role || "member";

  const isAdmin = role === "admin";
  const isSpouse = role === "spouse";
  const isMember = role === "member";

  // Permissions matrix
  const canAccessAssets = isAdmin || isSpouse;
  const canAccessVault = isAdmin || isSpouse;
  const canAccessFamily = isAdmin;
  const canAccessLogs = isAdmin;
  const canManageFinances = isAdmin || isSpouse;

  // Indonesian display label
  const roleLabel =
    role === "admin"
      ? "Kepala Keluarga"
      : role === "spouse"
      ? "Pengelola"
      : "Anggota";

  return {
    user,
    role,
    roleLabel,
    isAdmin,
    isSpouse,
    isMember,
    canAccessAssets,
    canAccessVault,
    canAccessFamily,
    canAccessLogs,
    canManageFinances,
    isLoading,
    isError: error,
    mutate,
  };
}

// 12. Realtime listener hook re-export
export { useFamilyRealtime } from "./use-family-realtime";

