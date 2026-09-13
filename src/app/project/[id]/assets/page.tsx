"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ImagePlus,
  MapPin,
  Package,
  Plus,
  ScanSearch,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/client";
import type { Asset, AssetType } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  AssetType,
  { icon: LucideIcon; i18nKey: "characters" | "locations" | "props" }
> = {
  character: { icon: UserRound, i18nKey: "characters" },
  location: { icon: MapPin, i18nKey: "locations" },
  prop: { icon: Package, i18nKey: "props" },
};

function AssetTypeIcon({ type, className }: { type: AssetType; className?: string }) {
  const Icon = TYPE_META[type].icon;
  return <Icon className={className} />;
}

const TYPE_ORDER: AssetType[] = ["character", "location", "prop"];
const FILTERS: Array<"all" | AssetType> = ["all", "character", "location", "prop"];

export default function AssetsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<"all" | AssetType>("all");
  const [parsing, setParsing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssetType>("character");

  function load() {
    return api<Asset[]>(`/api/projects/${id}/assets`).then(setAssets);
  }
  useEffect(() => {
    api<Asset[]>(`/api/projects/${id}/assets`)
      .then(setAssets)
      .catch(console.error);
  }, [id]);

  async function parse() {
    setParsing(true);
    setError("");
    try {
      await api(`/api/projects/${id}/assets/parse`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setParsing(false);
    }
  }

  function openAdd(t: AssetType) {
    setEditing(null);
    setType(t);
    setName("");
    setDescription("");
    setOpen(true);
  }

  function openEdit(a: Asset) {
    setEditing(a);
    setType(a.type);
    setName(a.name);
    setDescription(a.description);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) return;
    if (editing) {
      await api(`/api/assets/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      });
    } else {
      await api(`/api/projects/${id}/assets`, {
        method: "POST",
        body: JSON.stringify({ type, name, description }),
      });
    }
    setOpen(false);
    await load();
  }

  async function remove(a: Asset) {
    if (!confirm(t.delete + "?")) return;
    await api(`/api/assets/${a.id}`, { method: "DELETE" });
    await load();
  }

  async function genImage(a: Asset) {
    setGeneratingId(a.id);
    setError("");
    try {
      await api(`/api/assets/${a.id}/generate`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGeneratingId(null);
    }
  }

  const visible = filter === "all" ? assets : assets.filter((a) => a.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={parse} disabled={parsing}>
          <ScanSearch className="h-4 w-4" />
          {parsing ? t.generating : t.parseAssets}
        </Button>
        <Button variant="outline" onClick={() => openAdd("character")}>
          <Plus className="h-4 w-4" />
          {t.addAsset}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          const label = f === "all" ? t.allAssets : t[TYPE_META[f].i18nKey];
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
          {t.noAssets}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <Card key={a.id} className="group">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AssetTypeIcon type={a.type} className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <Badge variant="secondary" className="mt-0.5">
                        {t[TYPE_META[a.type].i18nKey]}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(a)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p
                  className="line-clamp-4 cursor-pointer text-xs leading-relaxed text-muted-foreground"
                  onClick={() => openEdit(a)}
                >
                  {a.description || t.pending}
                </p>
                <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                  {a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt={a.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                      {t.noImage}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={generatingId === a.id}
                  onClick={() => genImage(a)}
                >
                  <ImagePlus className="h-4 w-4" />
                  {generatingId === a.id
                    ? t.generating
                    : a.image_url
                      ? t.regenerateImage
                      : t.generateImage}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.edit : t.addAsset}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1">
                <Label>{t.assets}</Label>
                <div className="flex gap-2">
                  {TYPE_ORDER.map((ty) => (
                    <Button
                      key={ty}
                      type="button"
                      size="sm"
                      variant={type === ty ? "default" : "outline"}
                      onClick={() => setType(ty)}
                    >
                      <AssetTypeIcon type={ty} className="h-4 w-4" /> {t[TYPE_META[ty].i18nKey]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>{t.assetName}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>{t.description}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
