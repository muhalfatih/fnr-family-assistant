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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FileText, ExternalLink, ChevronDown, ChevronUp, Trash2, Search, ArrowDownRight, ArrowUpRight, ArrowLeftRight, ShoppingBag } from "lucide-react";

interface TransactionFeedProps {
  transactions: Transaction[];
  onDeleteTransaction?: (id: string) => void;
  enableTooltip?: boolean;
}

export function TransactionFeed({
  transactions,
  onDeleteTransaction,
  enableTooltip = false,
}: TransactionFeedProps) {
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
      <Card className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Riwayat Transaksi</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Aktivitas pemasukan dan pengeluaran kas keluarga.
              </CardDescription>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60">
                <Button
                  variant={filterType === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="h-7 text-xs px-2.5 rounded-md"
                >
                  Semua
                </Button>
                <Button
                  variant={filterType === "expense" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("expense")}
                  className="h-7 text-xs px-2.5 rounded-md"
                >
                  Keluar
                </Button>
                <Button
                  variant={filterType === "income" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("income")}
                  className="h-7 text-xs px-2.5 rounded-md"
                >
                  Masuk
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <TooltipProvider delayDuration={150}>
            <div className="divide-y border-t">
              {filteredTransactions.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <p className="text-sm font-medium text-foreground">Tidak ada transaksi yang cocok.</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Coba sesuaikan kata kunci pencarian atau ubah filter transaksi.
                  </p>
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpense = tx.type === "expense";
                  const isIncome = tx.type === "income";
                  const isExpanded = expandedTxId === tx.id;
                  const hasItems = tx.parsed_metadata?.items && tx.parsed_metadata.items.length > 0;
                  const fullTitle = tx.description || tx.category?.name || "Transaksi";

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 sm:px-5 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: Icon & Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                              isIncome
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isExpense
                                ? "bg-destructive/10 text-destructive"
                                : "bg-blue-500/10 text-blue-600"
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
                              {enableTooltip ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="font-medium text-sm truncate text-foreground cursor-pointer hover:underline decoration-dotted underline-offset-2"
                                      tabIndex={0}
                                    >
                                      {fullTitle}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="start"
                                    className="max-w-xs text-xs font-normal p-2.5 bg-popover text-popover-foreground border border-border shadow-lg"
                                  >
                                    <p className="font-semibold text-foreground text-xs leading-snug">{fullTitle}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                                      <span>{formatDateIndo(tx.transaction_date)}</span>
                                      <span>•</span>
                                      <span>{tx.category?.name || "Umum"}</span>
                                      {tx.wallet && (
                                        <>
                                          <span>•</span>
                                          <span className="font-medium text-foreground">{tx.wallet.name}</span>
                                        </>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="font-medium text-sm truncate text-foreground">
                                  {fullTitle}
                                </span>
                              )}

                              {tx.wallet && (
                                <Badge
                                  variant="outline"
                                  className="inline-flex shrink-0 whitespace-nowrap text-nowrap max-w-[130px] truncate text-[10px] font-medium px-1.5 py-0 border-border/80 bg-muted/30 text-muted-foreground"
                                  title={tx.wallet.name}
                                >
                                  {tx.wallet.name}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                              <span className="shrink-0">{formatDateIndo(tx.transaction_date)}</span>
                              <span>•</span>
                              <span className="truncate">{tx.category?.name || "Umum"}</span>
                              {tx.member && (
                                <>
                                  <span>•</span>
                                  <span className="truncate text-foreground font-medium">{tx.member.full_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                      {/* Right: Amount, Receipt Badge & Actions */}
                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        {/* Receipt toggle / link */}
                        {tx.parsed_metadata?.drive_view_url ? (
                          <a
                            href={tx.parsed_metadata.drive_view_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-full"
                            title="Lihat Nota Asli di Google Drive"
                          >
                            <FileText className="size-3" aria-hidden="true" />
                            <span>Nota</span>
                            <ExternalLink className="size-2.5" aria-hidden="true" />
                          </a>
                        ) : null}

                        {hasItems && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(tx.id)}
                            className="h-7 text-[11px] px-2 text-muted-foreground gap-1"
                          >
                            <span>{tx.parsed_metadata?.items?.length || 0} item</span>
                            {isExpanded ? (
                              <ChevronUp className="size-3" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="size-3" aria-hidden="true" />
                            )}
                          </Button>
                        )}

                        <span
                          className={`font-semibold text-sm sm:text-base tabular-nums ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatRupiah(tx.amount)}
                        </span>

                        {onDeleteTransaction && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTxToDelete(tx)}
                            className="size-7 text-muted-foreground hover:text-destructive rounded-md"
                            title="Hapus Transaksi"
                            aria-label={`Hapus transaksi ${tx.description || "ini"}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Seamless Nested Receipt Items (Guide Thread & Enhanced Spacing) */}
                    {isExpanded && hasItems && tx.parsed_metadata?.items && (
                      <div className="mt-4 pt-1 ml-3 sm:ml-4 border-l-2 border-primary/25 pl-4 pr-1 pb-1 space-y-3">
                        {/* Sub-Header: Store & Drive Link */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                            <ShoppingBag className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                            <span className="tracking-tight">
                              {tx.parsed_metadata?.merchant ? tx.parsed_metadata.merchant : "Rincian Item Belanja"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({tx.parsed_metadata.items.length} item)
                            </span>
                          </div>

                          {tx.parsed_metadata?.drive_view_url && (
                            <a
                              href={tx.parsed_metadata.drive_view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                              title="Lihat Nota Asli di Google Drive"
                            >
                              <span>Foto Struk</span>
                              <ExternalLink className="size-2.5" aria-hidden="true" />
                            </a>
                          )}
                        </div>

                        {/* Itemized List */}
                        <div className="space-y-1.5">
                          {tx.parsed_metadata.items.map((item: any, idx: number) => {
                            const qty = item.qty && Number(item.qty) > 0 ? Number(item.qty) : 1;
                            return (
                              <div
                                key={idx}
                                className="flex items-baseline justify-between gap-3 text-xs leading-relaxed"
                              >
                                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0 px-1.5 py-0.5 rounded bg-muted/60 leading-none">
                                    {qty}×
                                  </span>
                                  <span className="text-foreground text-xs font-medium truncate">
                                    {item.name}
                                  </span>
                                </div>
                                <span className="text-xs font-semibold text-foreground tabular-nums shrink-0 pl-2">
                                  {formatRupiah(item.price)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sub-Footer Summary */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
                          <span>Total Rincian</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatRupiah(tx.amount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Transaksi senilai <strong className="text-foreground font-semibold">{txToDelete ? formatRupiah(txToDelete.amount) : ""}</strong> ({txToDelete?.description || "Tanpa Keterangan"}) akan dihapus secara permanen dari buku kas keluarga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 text-xs px-3">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-9 text-xs px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
