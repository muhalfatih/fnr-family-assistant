"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      {/* 1. Bar Chart: Arus Kas Bulanan (4 Cols) */}
      <Card className="col-span-4 flex flex-col justify-between">
        <CardHeader>
          <CardTitle>Tren Arus Kas</CardTitle>
          <CardDescription>
            Perbandingan total pemasukan dan pengeluaran per bulan
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
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
                    tickFormatter={(val) => `${val / 1000000}jt`}
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

      {/* 2. Donut Chart: Distribusi Pengeluaran (3 Cols) */}
      <Card className="col-span-3 flex flex-col justify-between">
        <CardHeader>
          <CardTitle>Distribusi Belanja</CardTitle>
          <CardDescription>
            Proporsi pengeluaran kategori bulan ini
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex flex-col items-center">
          {filteredCategoryData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <p className="text-sm font-medium">Belum ada data pengeluaran kategori.</p>
              <p className="text-xs mt-1">Diagram akan menampilkan rincian persentase belanja yang terjadi.</p>
            </div>
          ) : (
            <>
              <div className="h-[190px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {filteredCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
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
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Category Legend List */}
              <div className="mt-3 w-full grid grid-cols-1 gap-1.5 text-xs">
                {filteredCategoryData.map((cat) => {
                  const percent = totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate text-muted-foreground">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium tabular-nums shrink-0">
                        <span>{formatRupiah(cat.value)}</span>
                        <span className="text-muted-foreground text-[10px]">({percent}%)</span>
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
