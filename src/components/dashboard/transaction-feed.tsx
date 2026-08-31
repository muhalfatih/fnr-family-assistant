"use client";

import React, { useState } from "react";
import { formatRupiah, formatDateIndo, formatDateTimeIndo } from "@/lib/utils";
import { Transaction } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, ExternalLink, Bot, Globe, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface TransactionFeedProps {
  transactions: Transaction[];
  onDeleteTransaction?: (id: string) => void;
}

export function TransactionFeed({ transactions, onDeleteTransaction }: TransactionFeedProps) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  return (
    <Card className="border-slate-200/80 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            🕒 Riwayat Transaksi Terbaru
          </CardTitle>
          <span className="text-xs text-slate-500">Live Feed ({transactions.length} Transaksi)</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">Belum ada transaksi yang dicatat.</p>
            <p className="mt-1 text-xs text-slate-400">
              Kirim pesan ke Telegram Bot atau gunakan tombol Tambah Transaksi di atas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isExpense = tx.type === "expense";
              const isIncome = tx.type === "income";
              const isExpanded = expandedTxId === tx.id;
              const hasItems = tx.parsed_metadata?.items && tx.parsed_metadata.items.length > 0;
              const isTelegram = tx.raw_prompt || tx.media_type !== "text";

              return (
                <div key={tx.id} className="p-4 transition-colors hover:bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    {/* Left: Icon & Description */}
                    <div className="flex items-start space-x-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-600"
                            : isExpense
                            ? "bg-rose-50 text-rose-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {isIncome ? "+" : isExpense ? "-" : "⇄"}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-900 text-sm">
                            {tx.description || tx.category?.name || "Transaksi"}
                          </span>

                          {/* Source badge */}
                          {isTelegram ? (
                            <Badge variant="telegram" className="text-[10px] space-x-1 py-0">
                              <Bot className="h-2.5 w-2.5" />
                              <span>Telegram</span>
                            </Badge>
                          ) : (
                            <Badge variant="web" className="text-[10px] space-x-1 py-0">
                              <Globe className="h-2.5 w-2.5" />
                              <span>Web</span>
                            </Badge>
                          )}

                          {/* Wallet badge */}
                          {tx.wallet && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              💳 {tx.wallet.name}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{formatDateIndo(tx.transaction_date)}</span>
                          <span>•</span>
                          <span>{tx.category?.name || "Lain-lain"}</span>
                          {tx.member && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">
                                {tx.member.full_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="text-right">
                      <p
                        className={`font-bold text-sm sm:text-base ${
                          isIncome
                            ? "text-emerald-600"
                            : isExpense
                            ? "text-rose-600"
                            : "text-blue-600"
                        }`}
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}
                        {formatRupiah(tx.amount)}
                      </p>

                      <div className="mt-1 flex items-center justify-end space-x-2">
                        {tx.drive_view_url && (
                          <a
                            href={tx.drive_view_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                            title="Buka Foto Struk di Google Drive"
                          >
                            <FileText className="mr-0.5 h-3 w-3" />
                            <span>Struk</span>
                            <ExternalLink className="ml-0.5 h-2.5 w-2.5" />
                          </a>
                        )}

                        {hasItems && (
                          <button
                            onClick={() => toggleExpand(tx.id)}
                            className="inline-flex items-center text-[11px] text-slate-500 hover:text-slate-800"
                          >
                            <span>Rincian</span>
                            {isExpanded ? (
                              <ChevronUp className="ml-0.5 h-3 w-3" />
                            ) : (
                              <ChevronDown className="ml-0.5 h-3 w-3" />
                            )}
                          </button>
                        )}

                        {onDeleteTransaction && (
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown Items */}
                  {isExpanded && hasItems && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
                      <p className="font-semibold text-slate-700 mb-1.5">
                        🧾 Detail Item Struk ({tx.parsed_metadata.merchant || "Nota"}):
                      </p>
                      <ul className="space-y-1">
                        {tx.parsed_metadata.items!.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-slate-600">
                            <span>
                              • {item.name} ({item.qty}x)
                            </span>
                            <span className="font-medium text-slate-900">
                              {formatRupiah(item.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
