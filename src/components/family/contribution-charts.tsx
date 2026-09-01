"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { PieChart as PieChartIcon, ArrowRight } from "lucide-react";

interface ContributionItem {
  memberId: string;
  name: string;
  role: string;
  spent: number;
  percentage: number;
  transactionCount: number;
  topCategory: string;
}

interface ContributionChartsProps {
  contributions: ContributionItem[];
  unassigned?: { spent: number; count: number; percentage: number };
  totalExpense: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export function ContributionCharts({ contributions, unassigned, totalExpense }: ContributionChartsProps) {
  // Filter members with spending > 0 for donut chart
  const activeMembers = contributions.filter((c) => c.spent > 0);

  const chartData = activeMembers.map((m, idx) => ({
    name: m.name,
    value: m.spent,
    percentage: m.percentage,
    color: COLORS[idx % COLORS.length],
  }));

  if (unassigned && unassigned.spent > 0) {
    chartData.push({
      name: "Belum Ditautkan",
      value: unassigned.spent,
      percentage: unassigned.percentage,
      color: "#94a3b8",
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-primary font-mono">{formatRupiah(data.value)}</p>
          <p className="text-muted-foreground">{data.percentage}% dari total pengeluaran</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Donut Chart Distribusi Pengeluaran */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="size-4 text-primary" aria-hidden="true" />
                <span>Proporsi Belanja Antar-Anggota</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Persentase pengeluaran keluarga bulan ini
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-normal">
              Total: {formatRupiah(totalExpense)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4">
              <p>Belum ada pengeluaran yang tercatat di bulan ini.</p>
              <p className="mt-1 text-muted-foreground/70">
                Catat pengeluaran melalui Telegram atau Web untuk melihat grafik proporsi.
              </p>
            </div>
          ) : (
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend Items */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 truncate">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="font-semibold text-foreground ml-auto tabular-nums">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Rincian Kategori Terbanyak per Anggota */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rincian Kontribusi per Anggota</CardTitle>
          <CardDescription className="text-xs">
            Kategori pengeluaran terbesar & frekuensi belanja masing-masing anggota
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {contributions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Belum ada profil anggota keluarga yang ditambahkan.
            </div>
          ) : (
            contributions.map((c, idx) => (
              <div
                key={c.memberId}
                className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{c.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                      {c.role}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Belanja Terbanyak: <span className="font-medium text-foreground">{c.topCategory}</span>
                  </p>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <p className="font-semibold text-foreground">{formatRupiah(c.spent)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {c.transactionCount} transaksi ({c.percentage}%)
                  </p>
                </div>
              </div>
            ))
          )}

          {unassigned && unassigned.spent > 0 && (
            <div className="p-3 rounded-lg border border-dashed text-xs flex items-center justify-between gap-3 text-muted-foreground">
              <div className="min-w-0">
                <p className="font-medium text-foreground">Transaksi Tanpa Pengirim</p>
                <p className="text-[11px]">Dicatat sebelum anggota keluarga ditautkan</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground">{formatRupiah(unassigned.spent)}</p>
                <p className="text-[11px]">{unassigned.count} transaksi ({unassigned.percentage}%)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
