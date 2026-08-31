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
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Riwayat Transaksi</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transaksi tercatat melalui Telegram & Web
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Cari transaksi…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-32 sm:w-44 pl-8"
                aria-label="Cari transaksi"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType("expense")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filterType === "expense"
                    ? "bg-background text-destructive shadow-sm font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setFilterType("income")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filterType === "income"
                    ? "bg-background text-emerald-600 shadow-sm font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">Tidak ada transaksi yang cocok.</p>
                <p className="text-xs text-muted-foreground mt-1">
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
                  <div
                    key={tx.id}
                    className="p-4 sm:px-6 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Icon & Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : isExpense
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="size-4" aria-hidden="true" />
                          ) : isExpense ? (
                            <ArrowDownRight className="size-4" aria-hidden="true" />
                          ) : (
                            <ArrowLeftRight className="size-4" aria-hidden="true" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">
                              {tx.description || tx.category?.name || "Transaksi"}
                            </span>
                            {tx.wallet && (
                              <Badge
                                variant="outline"
                                className="hidden sm:inline-flex text-xs font-normal"
                              >
                                {tx.wallet.name}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <span className="shrink-0">{formatDateIndo(tx.transaction_date)}</span>
                            <span>•</span>
                            <span className="truncate">{tx.category?.name || "Lain-lain"}</span>
                            {tx.member && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-foreground shrink-0">{tx.member.full_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex flex-col items-end shrink-0 pl-3">
                        <p
                          className={`font-semibold text-sm sm:text-base tabular-nums ${
                            isIncome
                              ? "text-emerald-600"
                              : isExpense
                              ? "text-foreground"
                              : "text-blue-600"
                          }`}
                        >
                          {isIncome ? "+" : isExpense ? "-" : ""}
                          {formatRupiah(tx.amount)}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                          {tx.drive_view_url && (
                            <a
                              href={tx.drive_view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-500/20"
                            >
                              <FileText className="size-3" aria-hidden="true" />
                              <span>Struk</span>
                              <ExternalLink className="size-2.5" aria-hidden="true" />
                            </a>
                          )}

                          {hasItems && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleExpand(tx.id)}
                              className="h-6 px-2 text-xs gap-1"
                            >
                              <span>{tx.parsed_metadata.items!.length} item</span>
                              {isExpanded ? (
                                <ChevronUp className="size-3" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="size-3" aria-hidden="true" />
                              )}
                            </Button>
                          )}

                          {onDeleteTransaction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setTxToDelete(tx)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="Hapus Transaksi"
                              aria-label={`Hapus transaksi ${tx.description || "ini"}`}
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Item Breakdown */}
                    {isExpanded && hasItems && (
                      <div className="mt-3 rounded-lg border bg-muted/50 p-3 text-xs">
                        <div className="font-semibold mb-2">
                          {tx.parsed_metadata.merchant || "Rincian Nota Belanja"}:
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {tx.parsed_metadata.items!.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-muted-foreground tabular-nums text-xs">
                              <span className="truncate pr-3">
                                {item.name} ({item.qty}x)
                              </span>
                              <span className="font-medium text-foreground shrink-0">
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
            <AlertDialogTitle>
              Hapus Catatan Transaksi?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi <strong>"{txToDelete?.description || "Tanpa Judul"}"</strong> senilai{" "}
              <strong>{txToDelete ? formatRupiah(txToDelete.amount) : ""}</strong> akan dihapus permanen dari buku kas keluarga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Ya, Hapus Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
