import { createFileRoute } from "@tanstack/react-router";

type Msg = { role?: string; content?: string };

export const Route = createFileRoute("/api/ai-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["OPENROUTER_API_KEY"];
        if (!key)
          return Response.json({ error: "OPENROUTER_API_KEY belum diatur." }, { status: 500 });

        let body: { messages?: Msg[]; hasImage?: boolean; deep?: boolean };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Body tidak valid." }, { status: 400 });
        }

        const deep = !!body.deep;

        const history = (body.messages ?? [])
          .slice(-8)
          .map(
            (m) =>
              `${m.role === "assistant" ? "AI" : "User"}: ${String(m.content ?? "").slice(0, 1500)}`,
          )
          .join("\n");

        const fallback = {
          needsSearch: false,
          needsReasoning: false,
          query: "",
          queries: [] as string[],
          title: "",
        };

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "deepseek/deepseek-v4-flash",
            messages: [
              {
                role: "system",
                content:
                  'You are the planner of an AI assistant. Read the conversation and reply ONLY with JSON: {"needsSearch": boolean, "needsReasoning": boolean, "queries": string[], "title": string}.\n' +
                  '- needsSearch: true only when fresh/factual/real-world info from the web is required (news, prices, people, events, versions, "sekarang", "terbaru"). false for chit-chat or opinions.\n' +
                  '- needsReasoning: true when the task needs multi-step thinking (math, logic puzzles, coding/debugging, planning, comparisons, "jelaskan kenapa"). false for simple chat or lookups.\n' +
                  `- queries: ${deep ? "exactly 3" : "1"} ADVANCED search queries written in the user's language (default Bahasa Indonesia). NEVER copy the user's sentence verbatim. Rewrite it the way a researcher would actually type it: expand vague words, add the real entities, years and terms implied, and drop chat filler ("sih", "dong", "tolong", "kan").\n` +
                  '  Example: user asks "Kenapa Prabowo menjadi Presiden?" -> ["Mengapa Prabowo Subianto dipilih menjadi presiden Indonesia 2024", "hasil pemilu presiden 2024 kemenangan Prabowo Gibran", "faktor kemenangan Prabowo pilpres 2024 analisis"].\n' +
                  (deep
                    ? "  For deep research the 3 queries MUST cover different angles (fakta inti, penyebab/analisis, data atau reaksi terbaru), not rephrasings of one another.\n"
                    : "") +
                  "  Empty array when needsSearch is false.\n" +
                  '- title: a short Indonesian chat title (2-5 words) that DESCRIBES the intent, never the raw message. "Halo" -> "Sapaan ramah". "Kenapa Prabowo menjadi Presiden?" -> "Kemenangan Prabowo 2024". "buatin kode react" -> "Bantuan kode React".',
              },
              {
                role: "user",
                content: `${body.hasImage ? "[User attached an image]\n" : ""}${history}`,
              },
            ],
          }),
        });

        if (!res.ok) return Response.json(fallback);

        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(match ? match[0] : raw) as {
            needsSearch?: boolean;
            needsReasoning?: boolean;
            query?: string;
            queries?: string[];
            title?: string;
          };
          const queries = (Array.isArray(parsed.queries) ? parsed.queries : [parsed.query ?? ""])
            .map((q) => String(q ?? "").trim().slice(0, 160))
            .filter((q) => q.length > 0)
            .slice(0, deep ? 3 : 1);
          return Response.json({
            needsSearch: !!parsed.needsSearch,
            needsReasoning: !!parsed.needsReasoning,
            query: queries[0] ?? "",
            queries,
            title: String(parsed.title ?? "").slice(0, 60),
          });
        } catch {
          return Response.json(fallback);
        }
      },
    },
  },
});
