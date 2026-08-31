import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-100 text-emerald-800",
        secondary: "border-transparent bg-slate-100 text-slate-800",
        destructive: "border-transparent bg-red-100 text-red-800",
        outline: "text-slate-700 border-slate-200",
        income: "border-transparent bg-emerald-100 text-emerald-800",
        expense: "border-transparent bg-rose-100 text-rose-800",
        transfer: "border-transparent bg-blue-100 text-blue-800",
        telegram: "border-transparent bg-sky-100 text-sky-800",
        web: "border-transparent bg-purple-100 text-purple-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
