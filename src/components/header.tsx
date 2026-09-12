"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        {t.appName}
      </Link>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/settings" aria-label={t.settings} />}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" />}
          >
            {locale === "zh" ? "中文" : "English"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLocale("zh")}>中文</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
