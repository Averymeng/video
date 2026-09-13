"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./language-provider";
import { cn } from "@/lib/utils";

const STEPS = ["script", "assets", "shots", "preview"] as const;

export function WorkflowNav({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const current = pathname.split("/").pop() ?? "script";

  return (
    <nav className="flex flex-wrap items-stretch gap-2">
      {STEPS.map((step, i) => {
        const active = current === step;
        return (
          <Link
            key={step}
            href={`/project/${projectId}/${step}`}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]"
                : "border-transparent bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "font-heading text-xs font-bold",
                active ? "text-primary-foreground/80" : "text-primary",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {t[step]}
          </Link>
        );
      })}
    </nav>
  );
}
