"use client";

import React, { useState } from "react";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Transaction } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, ExternalLink, ChevronDown, ChevronUp, Trash2, Search, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from "lucide-react";

interface TransactionFeedProps {
  transactions: Transaction[];
  onDeleteTransaction?: (id: string) => void;
}

export function TransactionFeed({ transactions, onDeleteTransaction }: TransactionFeedProps) {
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (tx.description || "").toLowerCase();
      const cat = (tx.category?.name || "").toLowerCase();
      const wallet = (tx.wallet?.name || "").toLowerCase();
      const member = (tx.member?.full_name || "").toLowerCase();
      return desc.includes(q) || cat.includes(q) || wallet.includes(q) || member.includes(q);
    }
    return true;
  });

  const confirmDelete = () => {
    if (txToDelete && onDeleteTransaction) {
      onDeleteTransaction(txToDelete.id);
      setTxToDelete(null);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4 border-b border-slate-100">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Riwayat Mutasi & Transaksi
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {filteredTransactions.length} transaksi tercatat melalui Telegram & Web
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-36 sm:w-44 pl-9 pr-3 text-xs rounded-full"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex rounded-full border border-slate-200/80 bg-slate-100/90 p-1 text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                  filterType === "all"
                    ? "bg-white text-slate-900 border border-slate-200/70"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType("expense")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                  filterType === "expense"
                    ? "bg-white text-rose-700 border border-slate-200/70"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pengeluaran
              </button>
              <button
                onClick={() => setFilterType("income")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                  filterType === "income"
                    ? "bg-white text-emerald-700 border border-slate-200/70"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-semibold text-slate-500">Tidak ada transaksi yang cocok.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Coba sesuaikan kata kunci pencarian atau ubah filter transaksi.
                </p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isExpense = tx.type === "expense";
                const isIncome = tx.type === "income";
                const isExpanded = expandedTxId === tx.id;
                const hasItems = tx.parsed_metadata?.items && tx.parsed_metadata.items.length > 0;

                return (
                  <div key={tx.id} className="p-4 transition-colors hover:bg-slate-50/70 first:rounded-t-none last:rounded-b-2xl">
                    <div className="flex items-center justify-between gap-3">
                      {/* Left Details */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : isExpense
                              ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                              : "bg-blue-50 text-blue-700 border border-blue-200/60"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="size-5" />
                          ) : isExpense ? (
                            <ArrowDownRight className="size-5" />
                          ) : (
                            <ArrowLeftRight className="size-5" />
                          )}
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              {tx.description || tx.category?.name || "Transaksi"}
                            </span>
                            {tx.wallet && (
                              <Badge variant="outline" className="text-[10px] font-medium py-0.5 px-2 bg-slate-50 rounded-full">
                                {tx.wallet.name}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{formatDateIndo(tx.transaction_date)}</span>
                            <span>•</span>
                            <span className="text-slate-600">{tx.category?.name || "Lain-lain"}</span>
                            {tx.member && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-slate-700">{tx.member.full_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Amount & Action */}
                      <div className="flex flex-col items-end">
                        <p
                          className={`font-bold text-sm sm:text-base tabular-nums ${
                            isIncome
                              ? "text-emerald-600"
                              : isExpense
                              ? "text-slate-900"
                              : "text-blue-600"
                          }`}
                        >
                          {isIncome ? "+" : isExpense ? "-" : ""}
                          {formatRupiah(tx.amount)}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          {tx.drive_view_url && (
                            <a
                              href={tx.drive_view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold border border-emerald-200/60"
                            >
                              <FileText className="size-3" />
                              <span>Struk</span>
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}

                          {hasItems && (
                            <button
                              onClick={() => toggleExpand(tx.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900"
                            >
                              <span>{tx.parsed_metadata.items!.length} item</span>
                              {isExpanded ? (
                                <ChevronUp className="size-3" />
                              ) : (
                                <ChevronDown className="size-3" />
                              )}
                            </button>
                          )}

                          {onDeleteTransaction && (
                            <button
                              onClick={() => setTxToDelete(tx)}
                              className="rounded-full p-1.5 text-slate-500 hover:text-rose-600 transition-colors"
                              title="Hapus Transaksi"
                              aria-label={`Hapus transaksi ${tx.description || "ini"}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Item Breakdown */}
                    {isExpanded && hasItems && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 text-xs">
                        <div className="font-bold text-slate-800 mb-2 text-xs">
                          {tx.parsed_metadata.merchant || "Rincian Nota Belanja"}:
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {tx.parsed_metadata.items!.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-600 tabular-nums text-xs">
                              <span>
                                {item.name} ({item.qty}x)
                              </span>
                              <span className="font-semibold text-slate-900">
                                {formatRupiah(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Catatan Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi <strong className="text-slate-900">"{txToDelete?.description || "Tanpa Judul"}"</strong> senilai{" "}
              <strong className="text-slate-900">{txToDelete ? formatRupiah(txToDelete.amount) : ""}</strong> akan dihapus permanen dari buku kas keluarga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Ya, Hapus Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
