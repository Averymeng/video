"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, UserRound, Wand2 } from "lucide-react";
import { api } from "@/lib/client";
import type { Character } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";

const VIEW_FIELDS = [
  { key: "front_view", label: "Front" },
  { key: "three_quarter_view", label: "3/4" },
  { key: "side_view", label: "Side" },
  { key: "back_view", label: "Back" },
] as const;

export default function CharactersPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [parsing, setParsing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api<Character[]>(`/api/projects/${id}/characters`);
    setCharacters(data);
  }
  useEffect(() => {
    api<Character[]>(`/api/projects/${id}/characters`)
      .then(setCharacters)
      .catch(console.error);
  }, [id]);

  async function parse() {
    setParsing(true);
    setError("");
    try {
      await api(`/api/projects/${id}/characters/parse`, { method: "POST" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setParsing(false);
    }
  }

  async function generate(charId: string) {
    setGeneratingId(charId);
    setError("");
    try {
      await api(`/api/characters/${charId}/generate`, { method: "POST" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGeneratingId(null);
    }
  }

  async function add() {
    if (!name.trim()) return;
    await api(`/api/projects/${id}/characters`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    setOpen(false);
    setName("");
    setDescription("");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={parse} disabled={parsing}>
          <Wand2 className="h-4 w-4" />
          {parsing ? t.generating : t.aiParseCharacters}
        </Button>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.edit}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
          {t.noCharacters}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {c.description || t.pending}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {VIEW_FIELDS.map(({ key, label }) => {
                    const url = c[key];
                    return (
                      <div key={key} className="space-y-1 text-center">
                        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={`${c.name} ${label}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => generate(c.id)}
                  disabled={generatingId === c.id}
                >
                  {generatingId === c.id ? t.generating : t.generateTurnaround}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t.projectName}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t.script}</Label>
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
            <Button onClick={add} disabled={!name.trim()}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
