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
  const { t } = useLanguage();
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t.myProjects}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            ({projects.length})
          </span>
        </h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.newProject}
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
          {t.noProjects}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/project/${p.id}/script`)}
            >
              <CardContent className="flex items-start justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </div>
                  <Badge
                    variant={p.status === "completed" ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {p.status === "completed" ? t.completed : t.pending}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => remove(e, p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
