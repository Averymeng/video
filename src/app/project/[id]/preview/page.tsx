"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Clapperboard, Download, Video } from "lucide-react";
import { api } from "@/lib/client";
import type { Shot } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [shots, setShots] = useState<Shot[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<Shot[]>(`/api/projects/${id}/shots`)
      .then(setShots)
      .catch(console.error);
  }, [id]);

  const completed = shots.filter((s) => s.video_url).length;

  function assemble() {
    // 视频合成在「里程碑 7 —— FFmpeg + 任务队列」中实现
    setMessage("视频合成功能将在下一里程碑（FFmpeg + 任务队列）中实现");
  }

  function download() {
    setMessage("素材打包下载将在视频合成里程碑中一并实现");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={assemble} disabled={completed === 0}>
          <Video className="h-4 w-4" />
          {t.assembleVideo}
        </Button>
        <Button variant="outline" onClick={download}>
          <Download className="h-4 w-4" />
          {t.downloadAssets}
        </Button>
        <span className="text-sm text-muted-foreground">
          {completed}/{shots.length}
        </span>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>

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
