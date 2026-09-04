"use client";

import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell({
  children,
  onAddTransaction,
}: {
  children: React.ReactNode;
  onAddTransaction?: () => void;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar onAddTransaction={onAddTransaction} />
      <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
        <AppHeader />
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
