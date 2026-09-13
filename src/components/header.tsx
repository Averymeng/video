"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Header() {
  const { locale, t, setLocale } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground/20 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-heading text-sm font-bold text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]">
            {locale === "zh" ? "漫" : "C"}
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              {locale === "zh" ? "中文" : "English"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale("zh")}>中文</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
