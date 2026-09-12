"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./language-provider";
import { cn } from "@/lib/utils";

const STEPS = ["script", "characters", "shots", "preview"] as const;

export function WorkflowNav({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const current = pathname.split("/").pop() ?? "script";

  return (
    <nav className="flex items-center gap-1 rounded-lg border bg-card p-1">
      {STEPS.map((step, i) => {
        const active = current === step;
        return (
          <div key={step} className="flex items-center">
            {i > 0 && <span className="mx-1 text-muted-foreground">›</span>}
            <Link
              href={`/project/${projectId}/${step}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t[step]}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
