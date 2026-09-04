"use client";

import React from "react";
import { formatRupiah, formatCompactRupiah, formatCompactNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector,
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

const cashFlowConfig = {
  income: {
    label: "Pemasukan",
    color: "#10b981",
  },
  expense: {
    label: "Pengeluaran",
    color: "#ef4444",
  },
} satisfies ChartConfig;

export function FinancialCharts({
  cashFlowData = [],
  categoryData = [],
}: FinancialChartsProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const totalExpense = categoryData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const filteredCategoryData = categoryData.filter((c) => c.value > 0);
  const hasCashFlowData = cashFlowData.some((f) => f.income > 0 || f.expense > 0);

  const activeItem =
    activeIndex !== null && filteredCategoryData[activeIndex]
      ? filteredCategoryData[activeIndex]
      : null;

  const categoryConfig = React.useMemo(() => {
    const cfg: ChartConfig = {
      total: {
        label: "Total Belanja",
      },
    };
    filteredCategoryData.forEach((cat, idx) => {
      cfg[`cat_${idx}`] = {
        label: cat.name,
        color: cat.color || `hsl(var(--chart-${(idx % 5) + 1}))`,
      };
    });
    return cfg;
  }, [filteredCategoryData]);

  // Custom interactive pie sector shape with smooth animation & outer glow ring
  const renderPieShape = React.useCallback(
    (props: any) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, index } = props;
      const isActive = activeIndex !== null && index === activeIndex;
      const isDimmed = activeIndex !== null && index !== activeIndex;

      if (isActive) {
        return (
          <g className="cursor-pointer">
            {/* Outer subtle halo ring */}
            <Sector
              cx={cx}
              cy={cy}
              innerRadius={outerRadius + 3}
              outerRadius={outerRadius + 6}
              startAngle={startAngle}
              endAngle={endAngle}
              fill={fill}
              opacity={0.4}
              className="transition-all duration-300 ease-out"
            />
            {/* Main active expanded sector */}
            <Sector
              cx={cx}
              cy={cy}
              innerRadius={innerRadius - 3}
              outerRadius={outerRadius + 9}
              startAngle={startAngle}
              endAngle={endAngle}
              fill={fill}
              className="transition-all duration-300 ease-out drop-shadow-md"
            />
          </g>
        );
      }

      return (
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={isDimmed ? 0.35 : 1}
          className="cursor-pointer transition-opacity duration-300 ease-out"
        />
      );
    },
    [activeIndex]
  );

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
              <ChartContainer config={cashFlowConfig} className="h-[280px] w-full">
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val: any) => [
                          formatRupiah(Number(val) || 0),
                          "",
                        ]}
                      />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(value) =>
                      value === "income" ? "Pemasukan" : "Pengeluaran"
                    }
                  />
                  <Bar
                    dataKey="income"
                    fill="var(--color-income, #10b981)"
                    radius={[4, 4, 0, 0]}
                    name="income"
                  />
                  <Bar
                    dataKey="expense"
                    fill="var(--color-expense, #ef4444)"
                    radius={[4, 4, 0, 0]}
                    name="expense"
                  />
                </BarChart>
              </ChartContainer>
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
                <ChartContainer config={categoryConfig} className="h-[200px] w-full aspect-auto">
                  <PieChart>
                    <Pie
                      data={filteredCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      shape={renderPieShape}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
                    >
                      {filteredCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                {/* Center Label (Clean Dynamic Interactive Callout Without Percentage) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 transition-all duration-300 ease-out">
                  {activeItem ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                      <span
                        className="text-xs font-semibold text-foreground truncate max-w-[120px] leading-tight"
                        title={activeItem.name}
                      >
                        {activeItem.name}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">
                        {formatCompactNumber(activeItem.value)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        Total
                      </span>
                      <span className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">
                        {formatCompactNumber(totalExpense)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Full-Width Category Row List with Minimalist Hover Sync & Mobile Tap */}
              <div className="mt-4 w-full divide-y divide-border/60 text-xs">
                {filteredCategoryData.map((cat, idx) => {
                  const percent = totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0;
                  const isActive = activeIndex === idx;
                  const isDimmed = activeIndex !== null && !isActive;

                  return (
                    <div
                      key={cat.name}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
                      className={`flex items-center justify-between py-2 px-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                        isActive
                          ? "bg-muted/60"
                          : isDimmed
                          ? "opacity-60 hover:opacity-100 hover:bg-muted/30"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Left: Static Clean Indicator Dot, Name & Percentage */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span
                          className={`text-xs sm:text-sm truncate ${
                            isActive ? "text-foreground font-semibold" : "text-foreground font-medium"
                          }`}
                        >
                          {cat.name}
                        </span>
                        <span className="text-muted-foreground text-[11px] font-medium tabular-nums shrink-0">
                          {percent}%
                        </span>
                      </div>

                      {/* Right: Direct Compact Number (No "Rp", Geist Sans) */}
                      <div className="flex items-center shrink-0 pl-3">
                        <span
                          className={`text-sm sm:text-base tabular-nums tracking-tight ${
                            isActive ? "font-bold text-foreground" : "font-bold text-foreground"
                          }`}
                        >
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
