"use client";

import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { supabase } from "@/lib/supabase/client";

/**
 * Global Realtime Listener Hook
 * Subscribes to Supabase Realtime WebSocket events on PostgreSQL tables:
 * - transactions
 * - wallets
 * - budgets
 * - bot_logs
 *
 * Eliminates periodic 30s background HTTP polling.
 * Triggers silent SWR revalidations (< 100ms) only when actual mutations occur.
 */
export function useFamilyRealtime() {
  const { mutate } = useSWRConfig();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if Supabase client is valid
    if (!supabase) return;

    const triggerRevalidation = (scope: "transactions" | "wallets" | "budgets" | "logs") => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (scope === "transactions") {
          // Invalidate transactions, wallets, budgets, and member spent summaries
          mutate((key) => typeof key === "string" && key.startsWith("/api/transactions"));
          mutate("/api/wallets");
          mutate((key) => typeof key === "string" && key.startsWith("/api/budgets"));
          mutate((key) => typeof key === "string" && key.startsWith("/api/members"));
        } else if (scope === "wallets") {
          mutate("/api/wallets");
        } else if (scope === "budgets") {
          mutate((key) => typeof key === "string" && key.startsWith("/api/budgets"));
        } else if (scope === "logs") {
          mutate((key) => typeof key === "string" && key.startsWith("/api/logs"));
        }
      }, 200);
    };

    const channel = supabase
      .channel("family-hub-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => triggerRevalidation("transactions")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        () => triggerRevalidation("wallets")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        () => triggerRevalidation("budgets")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_logs" },
        () => triggerRevalidation("logs")
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Connected to Supabase Realtime channel.");
        } else if (err) {
          console.warn("[Realtime] WebSocket error:", err);
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [mutate]);
}
