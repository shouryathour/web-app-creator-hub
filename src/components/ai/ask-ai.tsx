import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Bot, ChevronDown, Loader2, Plus, Square, Trash2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

export const MODELS = [
  { id: "claude-haiku-5-5", label: "Haiku 5.5", hint: "Fast and cheap, for normal questions" },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", hint: "Smarter, for hard analysis" },
] as const;
type ModelId = (typeof MODELS)[number]["id"];
type Meta = { model?: string; inputTokens?: number; outputTokens?: number; costUsd?: number };

const MODEL_KEY = "askai.model";
const money = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

export function useThreads() {
  return useQuery({
    queryKey: ["ai-threads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_threads").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function createThread() {
  const { data, error } = await supabase.from("ai_threads").insert({}).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export function ThreadList({ activeId }: { activeId?: string }) {
  const { data: threads = [] } = useThreads();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const onNew = async () => {
    const id = await createThread();
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    void navigate({ to: "/ai/$threadId", params: { threadId: id } });
  };
  const onDelete = async (id: string) => {
    if (!(await confirmDialog({ title: "Delete this chat?", description: "Only the chat is deleted. Your tracker data is not touched.", confirmLabel: "Delete" } as any))) return;
    await supabase.from("ai_threads").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    if (id === activeId) void navigate({ to: "/ai" });
  };
  return (
    <aside className="flex w-full flex-col gap-1 md:w-60 md:shrink-0">
      <Button onClick={() => void onNew()} className="mb-2 justify-start gap-2" variant="outline">
        <Plus className="size-4" /> New chat
      </Button>
      <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto md:max-h-[calc(100vh-14rem)]">
        {threads.map((t) => (
          <div key={t.id} className={cn("group flex items-center rounded-lg pr-1 text-[13px] hover:bg-subtle/60", t.id === activeId && "bg-subtle font-semibold")}>
            <Link to="/ai/$threadId" params={{ threadId: t.id }} className="min-w-0 flex-1 truncate px-2.5 py-1.5">
              {t.title}
            </Link>
            <button type="button" aria-label="Delete chat" onClick={() => void onDelete(t.id)} className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {threads.length === 0 && <p className="px-2.5 text-xs text-muted-foreground">No chats yet.</p>}
      </div>
    </aside>
  );
}

export function useStoredModel() {
  const [model, setModel] = useState<ModelId>("claude-haiku-5-5");
  useEffect(() => {
    const v = localStorage.getItem(MODEL_KEY);
    if (v === "claude-sonnet-5-5" || v === "claude-haiku-5-5") setModel(v);
  }, []);
  return [model, (m: ModelId) => { setModel(m); localStorage.setItem(MODEL_KEY, m); }] as const;
}

export function ModelPicker({ model, onChange }: { model: ModelId; onChange: (m: ModelId) => void }) {
  return (
    <Select value={model} onValueChange={(v) => onChange(v as ModelId)}>
      <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="AI model"><SelectValue /></SelectTrigger>
      <SelectContent>
        {MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} title={m.hint}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

function looksHard(text: string) {
  const t = text.toLowerCase();
  return t.length > 220 || /\b(compare|vs\.?|versus|trend|why|analy[sz]e|breakdown|each month|month by month|week by week|correlat)/.test(t);
}

export function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const qc = useQueryClient();
  const [model, setModel] = useStoredModel();
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/ai/chat" }), []);
  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onFinish: () => {
      void qc.invalidateQueries({ queryKey: ["ai-threads"] });
      void qc.invalidateQueries({ queryKey: ["ai-usage"] });
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => { taRef.current?.focus(); }, [threadId, status]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, status]);

  const total = messages.reduce(
    (a, m) => {
      const md = (m.metadata ?? {}) as Meta;
      return { cost: a.cost + (md.costUsd ?? 0), tokens: a.tokens + (md.inputTokens ?? 0) + (md.outputTokens ?? 0) };
    },
    { cost: 0, tokens: 0 },
  );

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text }, { headers: await authHeader(), body: { threadId, model } });
  };

  return (
    <div className="flex min-h-[60vh] min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span>This chat so far: <b className="text-foreground">{money(total.cost)}</b> · {total.tokens.toLocaleString()} tokens</span>
        <Link to="/settings" hash="ai_usage" className="hover:text-foreground hover:underline">Usage by day</Link>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md pt-10 text-center text-sm text-muted-foreground">
            <Bot className="mx-auto mb-3 size-8 text-foreground" />
            Ask anything about your leads, outreach and CRM. For example: "How many samples did we send last week?" or "Compare email reply rate this month vs last month."
          </div>
        )}
        {messages.map((m) => <MessageView key={m.id} m={m} />)}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Looking at your tracker…</div>
        )}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message || "Something went wrong. Please try again."}</div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        {model === "claude-haiku-5-5" && looksHard(input) && (
          <button type="button" onClick={() => setModel("claude-sonnet-5-5")} className="mb-2 text-xs text-muted-foreground hover:text-foreground">
            This looks like a deeper question. <u>Switch to Sonnet 5.5</u> for a better answer?
          </button>
        )}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-foreground/30">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            placeholder="Ask about your tracker…"
            rows={2}
            className="min-h-[52px] resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between">
            <ModelPicker model={model} onChange={setModel} />
            {busy ? (
              <Button size="icon" variant="outline" className="size-8" onClick={() => void stop()} aria-label="Stop"><Square className="size-3.5" /></Button>
            ) : (
              <Button size="icon" className="size-8" onClick={() => void send()} disabled={!input.trim()} aria-label="Send"><ArrowUp className="size-4" /></Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageView({ m }: { m: UIMessage }) {
  const md = (m.metadata ?? {}) as Meta;
  if (m.role === "user") {
    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl bg-foreground px-3.5 py-2 text-sm text-background">{text}</div>;
  }
  return (
    <div className="max-w-full text-sm">
      {m.parts.map((p, i) => {
        if (p.type === "text") return <div key={i} className="prose prose-sm max-w-none dark:prose-invert [&_table]:text-xs"><ReactMarkdown>{p.text}</ReactMarkdown></div>;
        if (p.type.startsWith("tool-")) {
          const name = p.type.slice(5).replace(/_/g, " ");
          const state = (p as any).state as string;
          return (
            <details key={i} className="my-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
              <summary className="flex cursor-pointer list-none items-center gap-1.5">
                <Wrench className="size-3" /> Checked {name}
                {state !== "output-available" && state !== "output-error" && <Loader2 className="size-3 animate-spin" />}
                {state === "output-error" && <span className="text-destructive">failed</span>}
                <ChevronDown className="ml-auto size-3" />
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify((p as any).input, null, 1)}</pre>
            </details>
          );
        }
        return null;
      })}
      {md.costUsd != null && (
        <div className="mt-1 text-[11px] text-faint">
          {MODELS.find((x) => x.id === md.model)?.label ?? md.model} · {((md.inputTokens ?? 0) + (md.outputTokens ?? 0)).toLocaleString()} tokens · {money(md.costUsd)}
        </div>
      )}
    </div>
  );
}

export async function loadThreadMessages(threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("msg_id,role,parts,model,input_tokens,output_tokens,cost_usd")
    .eq("thread_id", threadId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.msg_id,
    role: r.role as UIMessage["role"],
    parts: r.parts as UIMessage["parts"],
    metadata: r.role === "assistant" ? { model: r.model, inputTokens: r.input_tokens, outputTokens: r.output_tokens, costUsd: Number(r.cost_usd) } : undefined,
  }));
}
