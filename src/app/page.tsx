"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import type { Project } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function HomePage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await api<Project[]>("/api/projects");
    setProjects(data);
  }

  useEffect(() => {
    api<Project[]>("/api/projects").then(setProjects).catch(console.error);
  }, []);

  async function create() {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const p = await api<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setOpen(false);
      setName("");
      router.push(`/project/${p.id}/script`);
    } finally {
      setCreating(false);
    }
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm(t.deleteProject + "?")) return;
    await api(`/api/projects/${id}`, { method: "DELETE" });
    load();
  }

  const heroTagline =
    locale === "zh"
      ? "从一句创意到完整剧本、美术资产、分镜——AI 帮你把灵感一步步变成漫剧。"
      : "From a spark of an idea to a full script, art assets and storyboard — AI turns inspiration into a comic drama.";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Hero */}
      <div className="mb-8 rounded-lg border-2 border-foreground bg-card p-8 shadow-[4px_4px_0_0_var(--foreground)] sm:p-10">
        <span className="inline-flex items-center rounded-md border border-foreground bg-primary px-2.5 py-0.5 text-xs font-bold tracking-wide text-primary-foreground">
          {locale === "zh" ? "漫剧工坊" : "COMIC WORKSHOP"}
        </span>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{t.appName}</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{heroTagline}</p>
        <Button className="mt-6" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.newProject}
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t.myProjects}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            ({projects.length})
          </span>
        </h2>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-muted-foreground">
          {t.noProjects}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]"
              onClick={() => router.push(`/project/${p.id}/script`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-foreground/20 bg-secondary font-heading text-lg font-bold text-foreground">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(p.created_at)}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge variant={p.script ? "default" : "secondary"}>
                          {p.script ? t.script : t.pending}
                        </Badge>
                        {p.video_url && <Badge variant="outline">{t.video}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    onClick={(e) => remove(e, p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.newProject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t.projectName}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.projectNamePlaceholder}
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={create} disabled={!name.trim() || creating}>
              {t.createProject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
