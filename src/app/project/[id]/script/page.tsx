"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sparkles, Save } from "lucide-react";
import { api } from "@/lib/client";
import type { Project, Settings } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ScriptPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [script, setScript] = useState("");
  const [idea, setIdea] = useState("");
  const [model, setModel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const p = await api<Project>(`/api/projects/${id}`);
      setScript(p.script);
      const s = await api<Settings>("/api/settings");
      setModel(s.default_text_model ?? "");
    })().catch(console.error);
  }, [id]);

  async function generate() {
    if (!idea.trim() || generating) return;
    setGenerating(true);
    setMessage("");
    try {
      const res = await api<{ script: string }>(`/api/projects/${id}/script/generate`, {
        method: "POST",
        body: JSON.stringify({ idea, model: model || undefined }),
      });
      setScript(res.script);
      setMessage(t.generateSuccess);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ script }),
      });
      setMessage(t.saveSuccess);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-52 flex-1 space-y-1">
              <Label>{t.model}</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t.textModel}
              />
            </div>
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? t.generating : t.save}
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.aiGenerateScript}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={t.storyIdeaPlaceholder}
            rows={3}
          />
          <Button onClick={generate} disabled={!idea.trim() || generating}>
            <Sparkles className="h-4 w-4" />
            {generating ? t.generating : t.aiGenerateScript}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.script}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={t.generateScriptFirst}
            rows={18}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
