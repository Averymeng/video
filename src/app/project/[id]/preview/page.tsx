"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Clapperboard, Download, Video } from "lucide-react";
import { api } from "@/lib/client";
import type { Project, Shot } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [shots, setShots] = useState<Shot[]>([]);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [assembling, setAssembling] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      api<Project>(`/api/projects/${id}`),
      api<Shot[]>(`/api/projects/${id}/shots`),
    ]);
    setFinalVideo(p.video_url);
    setShots(s);
  }, [id]);

  useEffect(() => {
    Promise.all([api<Project>(`/api/projects/${id}`), api<Shot[]>(`/api/projects/${id}/shots`)])
      .then(([p, s]) => {
        setFinalVideo(p.video_url);
        setShots(s);
      })
      .catch(console.error);
  }, [id]);

  const completed = shots.filter((s) => s.video_url).length;

  async function assemble() {
    setAssembling(true);
    setMessage("");
    try {
      const res = await api<{ taskId: string }>(`/api/projects/${id}/assemble`, {
        method: "POST",
      });
      pollTask(res.taskId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "合成失败");
      setAssembling(false);
    }
  }

  async function pollTask(taskId: string) {
    for (;;) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await api<{ status: string; outputUrl?: string; error?: string }>(
          `/api/tasks/${taskId}`,
        );
        if (res.status === "completed" || res.status === "failed") {
          setAssembling(false);
          if (res.status === "failed") setMessage(res.error ?? "合成失败");
          else setMessage(t.saveSuccess);
          load();
          return;
        }
      } catch {
        setAssembling(false);
        return;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={assemble} disabled={assembling || completed === 0}>
          <Video className="h-4 w-4" />
          {assembling ? t.assembling : t.assembleVideo}
        </Button>
        {finalVideo ? (
          <Button variant="outline" render={<a href={finalVideo} download />}>
            <Download className="h-4 w-4" />
            {t.downloadAssets}
          </Button>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {completed}/{shots.length}
        </span>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>

      {finalVideo && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <video src={finalVideo} controls className="mx-auto max-h-[70vh] w-auto" />
          </CardContent>
        </Card>
      )}

      {shots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
          {t.noShots}
        </div>
      ) : (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
          {shots.map((s, i) => (
            <Card key={s.id} className="w-full overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Clapperboard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t.shot} {i + 1}
                  </span>
                </div>
                {s.video_url ? (
                  <video src={s.video_url} controls className="w-full" />
                ) : s.first_frame ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.first_frame} alt={s.description} className="w-full" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                    {t.pending}
                  </div>
                )}
                <p className="px-3 py-2 text-xs text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
