import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, isStepCount, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { AI_MODELS, buildTools, costUsd, systemPrompt, type AiModelId } from "@/lib/ai-chat.server";

const Body = z.object({
  threadId: z.string().uuid(),
  model: z.enum(Object.keys(AI_MODELS) as [AiModelId, ...AiModelId[]]),
  messages: z.array(z.any()).min(1).max(400),
});

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Please sign in again.", { status: 401 });
        const sb = userClient(token);
        const { data: u, error: ue } = await sb.auth.getUser(token);
        if (ue || !u.user) return new Response("Please sign in again.", { status: 401 });

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { threadId, model } = parsed.data;
        const messages = parsed.data.messages as UIMessage[];

        const { data: thread } = await sb.from("ai_threads").select("id,title").eq("id", threadId).maybeSingle();
        if (!thread) return new Response("Chat not found", { status: 404 });

        const apiKey = process.env["ANTHROPIC_API_KEY"];
        if (!apiKey) return new Response("The Anthropic key is not set up.", { status: 500 });

        // Save the newest user message before answering.
        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          const { error } = await sb.from("ai_messages").upsert(
            { thread_id: threadId, msg_id: last.id, role: "user", parts: last.parts as any },
            { onConflict: "thread_id,msg_id" },
          );
          if (error) console.error("[ai] save user msg", error.message);
          if (thread.title === "New chat") {
            const text = last.parts.map((p: any) => (p.type === "text" ? p.text : "")).join(" ").trim();
            if (text) await sb.from("ai_threads").update({ title: text.slice(0, 70) }).eq("id", threadId);
          }
        }

        const anthropic = createAnthropic({ apiKey });
        const result = streamText({
          model: anthropic(model),
          system: systemPrompt(model, new Date().toISOString().slice(0, 10)),
          messages: await convertToModelMessages(messages),
          tools: buildTools(sb as any),
          stopWhen: isStepCount(50),
          maxRetries: 0,
          abortSignal: request.signal,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === "finish") {
              const i = part.totalUsage.inputTokens ?? 0;
              const o = part.totalUsage.outputTokens ?? 0;
              return { model, inputTokens: i, outputTokens: o, costUsd: costUsd(model, i, o) };
            }
          },
          onFinish: async ({ responseMessage }) => {
            try {
              const usage = await result.totalUsage;
              const i = usage.inputTokens ?? 0;
              const o = usage.outputTokens ?? 0;
              const { error } = await sb.from("ai_messages").upsert(
                {
                  thread_id: threadId, msg_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as any,
                  model, input_tokens: i, output_tokens: o, cost_usd: costUsd(model, i, o),
                },
                { onConflict: "thread_id,msg_id" },
              );
              if (error) console.error("[ai] save reply", error.message);
              await sb.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            } catch (e) {
              console.error("[ai] finish", e);
            }
          },
          onError: (e) => {
            console.error("[ai] stream", e);
            const msg = e instanceof Error ? e.message : String(e);
            if (/credit|balance/i.test(msg)) return "Your Anthropic account is out of credit. Top it up at console.anthropic.com.";
            if (/rate/i.test(msg)) return "Too many requests right now. Please wait a moment and try again.";
            return "Something went wrong answering that. Please try again.";
          },
        });
      },
    },
  },
});
