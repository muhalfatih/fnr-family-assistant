"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetProgress, CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";
import { AddTransactionModal } from "@/components/dashboard/add-transaction-modal";
import { Transaction, Wallet, Category } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, Bot, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// Initial fallback mock data for instant preview before database is linked
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
    transaction_date: new Date().toISOString(),
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
    transaction_date: new Date().toISOString(),
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
    transaction_date: new Date().toISOString(),
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
    transaction_date: new Date().toISOString(),
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Calculate live summary
  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.current_balance), 0);
  const monthlyIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const monthlyExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalBudget = budgets.reduce((acc, b) => acc + b.target, 0);

  // Fetch real data if Supabase endpoint is active
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
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <Navbar onOpenAddModal={() => setIsAddModalOpen(true)} familyName="Keluarga F&R" />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Banner Quick Info */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Telegram Bot AI & Real-Time Sync Siap Digunakan
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Kirim teks, foto struk, atau voice note ke Bot Telegram. Sistem otomatis mengekstrak transaksi via Gemini, menyimpan ke Supabase, mengunggah foto ke Google Drive, dan menambah baris ke Google Sheets.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="outline"
              size="sm"
              className="shrink-0 bg-white"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              <span>Input Manual Web</span>
            </Button>
          </div>
        </div>

        {/* 4 Financial Summary Cards */}
        <SummaryCards
          totalBalance={totalBalance}
          monthlyIncome={monthlyIncome}
          monthlyExpense={monthlyExpense}
          totalBudget={totalBudget}
        />

        {/* Two-Column Layout: Budgeting & Live Transactions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Budget Progress (1 col) */}
          <div className="lg:col-span-1 space-y-6">
            <BudgetProgress budgets={budgets} />

            {/* Quick Wallet Balances Card */}
            <Card className="border-slate-200/80 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">
                  💳 Dompet & Rekening Terdaftar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{w.name}</span>
                    <span className="font-bold text-slate-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(w.current_balance)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Transaction Feed (2 cols) */}
          <div className="lg:col-span-2">
            <TransactionFeed
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
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
