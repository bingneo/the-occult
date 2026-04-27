import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

function hasChinese(str: string) {
  return /[\u4e00-\u9fff]/.test(str);
}

async function toEnglishKeywords(query: string): Promise<string> {
  try {
    const resp = await qwen.chat.completions.create({
      model: "qwen-turbo",
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content:
            "Translate the following Chinese text into 3-5 concise English academic search keywords. " +
            "Output ONLY English words separated by spaces. No Chinese characters, no punctuation, no explanation.",
        },
        { role: "user", content: query },
      ],
    });
    const kw = resp.choices[0]?.message?.content?.trim() ?? "";
    console.log("[papers] AI keywords:", kw, "| from:", query.slice(0, 50));
    return kw.length > 0 ? kw : query;
  } catch (err) {
    console.error("[papers] toEnglishKeywords failed:", err);
    return query;
  }
}

router.post("/papers/search", async (req, res) => {
  try {
    const { query } = req.body as { query: string };
    if (!query) return res.status(400).json({ error: "query required" });

    const rawQuery = query.slice(0, 200);
    const searchQuery = hasChinese(rawQuery)
      ? await toEnglishKeywords(rawQuery)
      : rawQuery;

    const encoded = encodeURIComponent(searchQuery.slice(0, 150));

    const url = `https://api.openalex.org/works?search=${encoded}&per_page=5&sort=relevance_score:desc&mailto=occult@thefailure.lab`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "TheOccult/1.0 (failed-experiment-platform; mailto:occult@thefailure.lab)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("OpenAlex error:", response.status, await response.text().catch(() => ""));
      return res.status(502).json({ error: `OpenAlex returned ${response.status}` });
    }

    const data: any = await response.json();
    const results = (data.results ?? []).slice(0, 5);

    const papers = results.map((w: any) => {
      const authorships: any[] = w.authorships ?? [];
      const authors = authorships
        .slice(0, 3)
        .map((a: any) => a.author?.display_name ?? "Unknown")
        .filter(Boolean);

      const doi = w.doi ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}` : null;
      const paperUrl = doi ?? w.id ?? "https://openalex.org";

      return {
        title: w.title ?? "Untitled",
        authors,
        year: w.publication_year ?? null,
        url: paperUrl,
      };
    });

    res.json({ papers, keywords: searchQuery });
  } catch (err: any) {
    console.error("Paper search error:", err);
    res.status(500).json({ error: err.message ?? "Paper search failed" });
  }
});

export default router;
