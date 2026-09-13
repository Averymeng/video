"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Clapperboard, Film, ImageIcon, LayoutGrid, Plus } from "lucide-react";
import { api } from "@/lib/client";
import type { Shot } from "@/lib/types";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ASPECT_RATIOS = ["9:16", "16:9", "1:1"];

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const variant =
    status === "completed"
      ? "default"
      : status === "processing"
        ? "secondary"
        : status === "failed"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{t[status as keyof typeof t] ?? status}</Badge>;
}

export default function ShotsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [shots, setShots] = useState<Shot[]>([]);
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const shotsRef = useRef<Shot[]>([]);

  const load = useCallback(async () => {
    const data = await api<Shot[]>(`/api/projects/${id}/shots`);
    shotsRef.current = data;
    setShots(data);
  }, [id]);

  useEffect(() => {
    api<Shot[]>(`/api/projects/${id}/shots`)
      .then((data) => {
        shotsRef.current = data;
        setShots(data);
      })
      .catch(console.error);
  }, [id]);

  // 页面加载后，自动续查仍在 processing 的视频任务
  useEffect(() => {
    const pending = shotsRef.current.filter((s) => s.status === "processing" && s.task_id);
    pending.forEach((s) => pollVideo(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function parse() {
    setParsing(true);
    setMessage("");
    try {
      await api(`/api/projects/${id}/shots/parse`, { method: "POST" });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "拆解失败");
    } finally {
      setParsing(false);
    }
  }

  async function add() {
    if (!description.trim()) return;
    await api(`/api/projects/${id}/shots`, {
      method: "POST",
      body: JSON.stringify({ description, aspect_ratio: aspectRatio }),
    });
    setOpen(false);
    setDescription("");
    await load();
  }

  async function genFrame(shot: Shot, type: "first_frame" | "last_frame") {
    setBusy(`${shot.id}:${type}`);
    setMessage("");
    try {
      await api(`/api/shots/${shot.id}/generate`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function genVideo(shot: Shot) {
    setBusy(`${shot.id}:video`);
    setMessage("");
    try {
      await api<{ taskId: string }>(`/api/shots/${shot.id}/generate`, {
        method: "POST",
        body: JSON.stringify({ type: "video" }),
      });
      await load();
      pollVideo(shot.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function pollVideo(shotId: string) {
    for (;;) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const res = await api<{ status: string; videoUrl?: string; error?: string }>(
          `/api/shots/${shotId}/status`,
        );
        if (res.status === "succeeded" || res.status === "failed") {
          if (res.status === "failed") setMessage(res.error ?? "视频生成失败");
          await load();
          return;
        }
      } catch {
        return;
      }
    }
  }

  async function batchFrames() {
    setBusy("batch-frames");
    setMessage("");
    for (const s of shotsRef.current) {
      if (!s.first_frame) {
        try {
          await api(`/api/shots/${s.id}/generate`, {
            method: "POST",
            body: JSON.stringify({ type: "first_frame" }),
          });
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "生成失败");
        }
      }
    }
    await load();
    setBusy(null);
  }

  async function batchVideo() {
    setBusy("batch-video");
    setMessage("");
    for (const s of shotsRef.current) {
      if (!s.video_url) {
        try {
          await api<{ taskId: string }>(`/api/shots/${s.id}/generate`, {
            method: "POST",
            body: JSON.stringify({ type: "video" }),
          });
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "生成失败");
        }
      }
    }
    await load();
    setBusy(null);
    shotsRef.current
      .filter((s) => !s.video_url)
      .forEach((s) => pollVideo(s.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={parse} disabled={parsing}>
          <LayoutGrid className="h-4 w-4" />
          {parsing ? t.generating : t.aiParseShots}
        </Button>
        <Button variant="outline" onClick={batchFrames} disabled={busy === "batch-frames"}>
          <ImageIcon className="h-4 w-4" />
          {t.batchGenerateFrames}
        </Button>
        <Button variant="outline" onClick={batchVideo} disabled={busy === "batch-video"}>
          <Film className="h-4 w-4" />
          {t.batchGenerateVideo}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.addShot}
        </Button>
        {message && <span className="text-sm text-destructive">{message}</span>}
      </div>

      {shots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
          {t.noShots}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {shots.map((s, i) => (
            <Card key={s.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {t.shot} {i + 1}
                    </span>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  {s.description || t.pending}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {(["first_frame", "last_frame"] as const).map((field) => {
                    const label = field === "first_frame" ? t.firstFrame : t.lastFrame;
                    const url = s[field];
                    return (
                      <div key={field} className="space-y-1">
                        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={label} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[11px] text-muted-foreground">{label}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={busy === `${s.id}:${field}`}
                          onClick={() => genFrame(s, field)}
                        >
                          {busy === `${s.id}:${field}` ? t.generating : label}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {s.video_url ? (
                  <video src={s.video_url} controls className="w-full rounded-md border" />
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={busy === `${s.id}:video` || s.status === "processing"}
                    onClick={() => genVideo(s)}
                  >
                    <Film className="h-4 w-4" />
                    {s.status === "processing"
                      ? t.processing
                      : busy === `${s.id}:video`
                        ? t.generating
                        : t.video}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addShot}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t.description}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <Label>{t.aspectRatio}</Label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={aspectRatio === r ? "default" : "outline"}
                    onClick={() => setAspectRatio(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={add} disabled={!description.trim()}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
