"use client";

import React from "react";
import { formatRupiah, formatCompactRupiah, formatCompactNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export interface MonthlyFlowData {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryPieData {
  name: string;
  value: number;
  color: string;
}

interface FinancialChartsProps {
  cashFlowData?: MonthlyFlowData[];
  categoryData?: CategoryPieData[];
}

export function FinancialCharts({
  cashFlowData = [],
  categoryData = [],
}: FinancialChartsProps) {
  const totalExpense = categoryData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const filteredCategoryData = categoryData.filter((c) => c.value > 0);
  const hasCashFlowData = cashFlowData.some((f) => f.income > 0 || f.expense > 0);

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* 1. Bar Chart: Arus Kas Bulanan (50% Column) */}
      <Card className="flex flex-col justify-between rounded-xl border border-border/80 bg-card h-full">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold">Tren Arus Kas</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Perbandingan total pemasukan dan pengeluaran per bulan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {!hasCashFlowData ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <p className="text-sm font-medium">Belum ada data arus kas.</p>
              <p className="text-xs mt-1">Grafik akan otomatis terisi saat transaksi tercatat di sistem.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cashFlowData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatCompactRupiah(val)}
                  />
                  <Tooltip
                    formatter={(val: any) => [
                      formatRupiah(Number(val) || 0),
                      "",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(value) =>
                      value === "income" ? "Pemasukan" : "Pengeluaran"
                    }
                  />
                  <Bar
                    dataKey="income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="income"
                  />
                  <Bar
                    dataKey="expense"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    name="expense"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Donut Chart: Proporsi Belanja per Kategori (50% Column) */}
      <Card className="flex flex-col justify-between rounded-xl border border-border/80 bg-card h-full">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold">Distribusi Belanja</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Proporsi pengeluaran kategori bulan ini
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 flex flex-col items-center">
          {filteredCategoryData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <p className="text-sm font-medium">Belum ada data pengeluaran kategori.</p>
              <p className="text-xs mt-1">Diagram akan menampilkan rincian persentase belanja yang terjadi.</p>
            </div>
          ) : (
            <>
              <div className="h-[200px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {filteredCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => {
                        const numericVal = Number(val) || 0;
                        const percent = totalExpense > 0 ? Math.round((numericVal / totalExpense) * 100) : 0;
                        return [`${formatRupiah(numericVal)} (${percent}%)`, name];
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute flex flex-col items-center pointer-events-none text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                    Total
                  </span>
                  <span className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground">
                    {formatCompactNumber(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Enhanced Full-Width Category Row List (Direct Numbers Without Rp, Geist Sans) */}
              <div className="mt-4 w-full divide-y divide-border/60 text-xs">
                {filteredCategoryData.map((cat) => {
                  const percent = totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0;
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/30 transition-colors rounded-md"
                    >
                      {/* Left: Indicator, Name & Percentage */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-foreground font-medium text-xs sm:text-sm truncate">
                          {cat.name}
                        </span>
                        <span className="text-muted-foreground text-[11px] font-medium tabular-nums shrink-0">
                          {percent}%
                        </span>
                      </div>

                      {/* Right: Direct Compact Number (No "Rp", Geist Sans) */}
                      <div className="flex items-center shrink-0 pl-3">
                        <span className="font-bold text-sm sm:text-base text-foreground tabular-nums tracking-tight">
                          {formatCompactNumber(cat.value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
