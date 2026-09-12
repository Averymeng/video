"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import type {
  ModelCapability,
  Provider,
  ProviderProtocol,
  Settings,
} from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROTOCOLS: ProviderProtocol[] = ["openai", "gemini", "seedance", "google"];
const CAPABILITIES: ModelCapability[] = ["text", "image", "video"];

const PROTOCOL_BASE_URL: Record<ProviderProtocol, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  seedance: "https://ark.cn-beijing.volces.com/api/v3",
  google: "https://us-central1-aiplatform.googleapis.com",
};

type ModelRow = { id: string; name?: string };

// API 返回的 capabilities 是数组，DB 里存的是 JSON 字符串，这里统一规范化
function getCaps(p: Provider): ModelCapability[] {
  const c = p.capabilities as unknown;
  if (Array.isArray(c)) return c as ModelCapability[];
  if (typeof c === "string") {
    try {
      return JSON.parse(c) as ModelCapability[];
    } catch {
      return [];
    }
  }
  return [];
}

export default function SettingsPage() {
  const { t } = useLanguage();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [open, setOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pProtocol, setPProtocol] = useState<ProviderProtocol>("openai");
  const [pBaseUrl, setPBaseUrl] = useState("");
  const [pApiKey, setPApiKey] = useState("");
  const [pCaps, setPCaps] = useState<ModelCapability[]>(["text"]);

  const load = useCallback(async () => {
    const [ps, s] = await Promise.all([
      api<Provider[]>("/api/providers"),
      api<Settings>("/api/settings"),
    ]);
    setProviders(ps);
    setText(s.default_text_model ?? "");
    setImage(s.default_image_model ?? "");
    setVideo(s.default_video_model ?? "");
  }, []);

  useEffect(() => {
    Promise.all([api<Provider[]>("/api/providers"), api<Settings>("/api/settings")])
      .then(([ps, s]) => {
        setProviders(ps);
        setText(s.default_text_model ?? "");
        setImage(s.default_image_model ?? "");
        setVideo(s.default_video_model ?? "");
      })
      .catch(console.error);
  }, []);

  async function saveDefaults() {
    setSaving(true);
    setMsg("");
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          default_text_model: text || null,
          default_image_model: image || null,
          default_video_model: video || null,
        }),
      });
      setMsg(t.saveSuccess);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function addProvider() {
    setMsg("");
    try {
      await api("/api/providers", {
        method: "POST",
        body: JSON.stringify({
          name: pName,
          protocol: pProtocol,
          base_url: pBaseUrl,
          api_key: pApiKey,
          capabilities: pCaps,
        }),
      });
      setOpen(false);
      setPName("");
      setPApiKey("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "添加失败");
    }
  }

  async function removeProvider(p: Provider) {
    if (!confirm(t.delete + "?")) return;
    await api(`/api/providers/${p.id}`, { method: "DELETE" });
    await load();
  }

  function pickModel(model: string, capability: ModelCapability) {
    if (capability === "text") setText(model);
    else if (capability === "image") setImage(model);
    else setVideo(model);
    setMsg(t.saveSuccess + " · " + t.save);
  }

  function onProtocolChange(protocol: ProviderProtocol) {
    setPProtocol(protocol);
    if (!pBaseUrl) setPBaseUrl(PROTOCOL_BASE_URL[protocol]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">{t.settings}</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.defaultModel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="space-y-1">
            <Label>{t.textModel}</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t.imageModel}</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t.videoModel}</Label>
            <Input value={video} onChange={(e) => setVideo(e.target.value)} />
          </div>
          <Button onClick={saveDefaults} disabled={saving}>
            {saving ? t.generating : t.save}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{t.providers}</CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t.addProvider}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {providers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              {t.addProvider}
            </div>
          ) : (
            providers.map((p) => (
              <ProviderRow
                key={p.id}
                provider={p}
                onDelete={() => removeProvider(p)}
                onPick={pickModel}
              />
            ))
          )}
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addProvider}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t.projectName}</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t.protocol}</Label>
              <div className="flex flex-wrap gap-1">
                {PROTOCOLS.map((proto) => (
                  <Button
                    key={proto}
                    type="button"
                    size="sm"
                    variant={pProtocol === proto ? "default" : "outline"}
                    onClick={() => onProtocolChange(proto)}
                  >
                    {proto}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t.baseUrl}</Label>
              <Input
                value={pBaseUrl}
                onChange={(e) => setPBaseUrl(e.target.value)}
                placeholder={PROTOCOL_BASE_URL[pProtocol]}
              />
            </div>
            <div className="space-y-1">
              <Label>{t.apiKey}</Label>
              <Input
                type="password"
                value={pApiKey}
                onChange={(e) => setPApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t.capabilities}</Label>
              <div className="flex flex-wrap gap-1">
                {CAPABILITIES.map((cap) => {
                  const active = pCaps.includes(cap);
                  return (
                    <Button
                      key={cap}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        setPCaps((prev) =>
                          active ? prev.filter((c) => c !== cap) : [...prev, cap],
                        )
                      }
                    >
                      {cap}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={addProvider}
              disabled={!pName.trim() || !pBaseUrl.trim() || !pApiKey.trim() || pCaps.length === 0}
            >
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderRow({
  provider,
  onDelete,
  onPick,
}: {
  provider: Provider;
  onDelete: () => void;
  onPick: (model: string, capability: ModelCapability) => void;
}) {
  const { t } = useLanguage();
  const caps = getCaps(provider);
  const [models, setModels] = useState<ModelRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const [cap, setCap] = useState<ModelCapability>(caps[0] ?? "text");
  const [err, setErr] = useState("");

  async function fetchModels() {
    setLoading(true);
    setErr("");
    try {
      const data = await api<ModelRow[]>(`/api/providers/${provider.id}/models`);
      setModels(data);
      if (data.length) setModel(data[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "拉取失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{provider.name}</span>
          <Badge variant="secondary">{provider.protocol}</Badge>
          {caps.map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
        {provider.base_url}
      </div>

      {models === null ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={fetchModels}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          {loading ? t.generating : t.fetchModels}
        </Button>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="h-8 max-w-64 rounded-md border border-input bg-transparent px-2 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ? `${m.name} (${m.id})` : m.id}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            {caps.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={cap === c ? "default" : "outline"}
                onClick={() => setCap(c)}
              >
                {c}
              </Button>
            ))}
          </div>
          <Button size="sm" onClick={() => onPick(model, cap)} disabled={!model}>
            {t.defaultModel}
          </Button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
