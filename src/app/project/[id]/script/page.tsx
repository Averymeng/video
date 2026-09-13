"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, PenLine, RefreshCw, Save } from "lucide-react";
import { api } from "@/lib/client";
import type { Project, ScriptVersion } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const GENRES = ["悬疑", "爱情", "搞笑", "热血", "科幻", "古风", "都市", "奇幻"];

const EMOTIONS = ["治愈", "燃向", "虐心", "轻松", "紧张", "励志", "浪漫", "惊悚"];

const PROTAGONIST_PRESETS = ["普通社畜", "落魄剑客", "天才少女", "退休特工", "觉醒 AI", "失忆少年"];

type Mode = "wizard" | "picking" | "view";

export default function ScriptPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [mode, setMode] = useState<Mode>("wizard");
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("");
  const [emotion, setEmotion] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Project>(`/api/projects/${id}`)
      .then((p) => {
        setScript(p.script);
        setScriptTitle(p.script_title);
        setLogline(p.logline);
        setGenre(p.genre);
        setEmotion(p.emotion);
        setProtagonist(p.protagonist);
        setMode(p.script ? "view" : "wizard");
      })
      .catch(console.error);
  }, [id]);

  async function generateVersions() {
    if (!idea.trim() || generating) return;
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{ versions: ScriptVersion[] }>(
        `/api/projects/${id}/script/generate`,
        { method: "POST", body: JSON.stringify({ idea, genre, emotion, protagonist }) },
      );
      setVersions(res.versions);
      setMode("picking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function chooseVersion(v: ScriptVersion) {
    setSaving(true);
    setError("");
    try {
      await api(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          script: v.script,
          script_title: v.title,
          logline: v.logline,
          genre,
          emotion,
          protagonist,
        }),
      });
      setScript(v.script);
      setScriptTitle(v.title);
      setLogline(v.logline);
      setVersions([]);
      setMode("view");
      setMessage(t.saveSuccess);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveScript() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ script, script_title: scriptTitle, logline }),
      });
      setMessage(t.saveSuccess);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function backToWizard() {
    setVersions([]);
    setMode("wizard");
    setError("");
    setMessage("");
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {!error && message && <p className="text-sm text-muted-foreground">{message}</p>}

      {mode === "wizard" && (
        <Wizard
          idea={idea}
          setIdea={setIdea}
          genre={genre}
          setGenre={setGenre}
          emotion={emotion}
          setEmotion={setEmotion}
          protagonist={protagonist}
          setProtagonist={setProtagonist}
          generating={generating}
          onGenerate={generateVersions}
        />
      )}

      {mode === "picking" && (
        <VersionPicker
          versions={versions}
          saving={saving}
          onChoose={chooseVersion}
          onBack={backToWizard}
        />
      )}

      {mode === "view" && (
        <ScriptView
          scriptTitle={scriptTitle}
          setScriptTitle={setScriptTitle}
          logline={logline}
          setLogline={setLogline}
          script={script}
          setScript={setScript}
          saving={saving}
          onSave={saveScript}
          onRegenerate={backToWizard}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 创作向导：输入创意 → 选择题材 / 情感 / 主角 → 生成
// ---------------------------------------------------------------------------
function Wizard({
  idea,
  setIdea,
  genre,
  setGenre,
  emotion,
  setEmotion,
  protagonist,
  setProtagonist,
  generating,
  onGenerate,
}: {
  idea: string;
  setIdea: (v: string) => void;
  genre: string;
  setGenre: (v: string) => void;
  emotion: string;
  setEmotion: (v: string) => void;
  protagonist: string;
  setProtagonist: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-5 w-5 text-primary" />
            {t.storyIdea}
          </CardTitle>
          <CardDescription>{t.storyIdeaPlaceholder}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder={t.storyIdeaPlaceholder}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.genre}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GENRES.map((g) => (
              <OptionCard
                key={g}
                label={g}
                active={genre === g}
                onClick={() => setGenre(genre === g ? "" : g)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.emotion}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EMOTIONS.map((g) => (
              <OptionCard
                key={g}
                label={g}
                active={emotion === g}
                onClick={() => setEmotion(emotion === g ? "" : g)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.protagonist}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={protagonist}
            onChange={(e) => setProtagonist(e.target.value)}
            placeholder={t.protagonistPlaceholder}
          />
          <div className="flex flex-wrap gap-2">
            {PROTAGONIST_PRESETS.map((p) => (
              <Badge
                key={p}
                variant={protagonist === p ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setProtagonist(protagonist === p ? "" : p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={onGenerate} disabled={!idea.trim() || generating} className="w-full">
        <PenLine className="h-4 w-4" />
        {generating ? t.generating : t.generateVersions}
      </Button>
    </div>
  );
}

function OptionCard({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]"
          : "border-transparent bg-secondary text-secondary-foreground hover:border-foreground/30",
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 版本选择：AI 生成多个候选剧本，卡片式对比选择
// ---------------------------------------------------------------------------
function VersionPicker({
  versions,
  saving,
  onChoose,
  onBack,
}: {
  versions: ScriptVersion[];
  saving: boolean;
  onChoose: (v: ScriptVersion) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.chooseVersion}</h2>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t.backToEdit}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {versions.map((v, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                #{i + 1}
              </Badge>
              <CardTitle>{v.title}</CardTitle>
              {v.logline && (
                <CardDescription className="italic">{v.logline}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {v.script}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => onChoose(v)} disabled={saving}>
                <Check className="h-4 w-4" />
                {t.confirm}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 剧本展示：标题 + 梗概 + 正文，可编辑、可重新创作
// ---------------------------------------------------------------------------
function ScriptView({
  scriptTitle,
  setScriptTitle,
  logline,
  setLogline,
  script,
  setScript,
  saving,
  onSave,
  onRegenerate,
}: {
  scriptTitle: string;
  setScriptTitle: (v: string) => void;
  logline: string;
  setLogline: (v: string) => void;
  script: string;
  setScript: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onRegenerate: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.script}</h2>
        <Button variant="outline" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" />
          {t.regenerate}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <Label>{t.scriptTitle}</Label>
            <Input
              value={scriptTitle}
              onChange={(e) => setScriptTitle(e.target.value)}
              placeholder={t.scriptTitle}
            />
          </div>
          <div className="space-y-1">
            <Label>{t.logline}</Label>
            <Input
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder={t.logline}
            />
          </div>
          <div className="space-y-1">
            <Label>{t.script}</Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={20}
              className="font-mono text-sm leading-relaxed"
            />
          </div>
          <Button onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? t.generating : t.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
