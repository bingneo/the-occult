export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiMode = "void" | "confession";

export type Paper = {
  title: string;
  authors: string[];
  year: number | null;
  url: string;
};

export async function streamAiReply(
  messages: ChatMessage[],
  mode: AiMode,
  onChunk: (partial: string) => void,
  onDone: (full: string) => void,
  onError: (fallback: string) => void
) {
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, mode }),
    });

    if (!res.ok || !res.body) {
      onError("系统连接失败，请稍后重试。");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.error) { onError("VOID_ERROR: " + payload.error); return; }
          if (payload.done) { onDone(full); return; }
          if (payload.content) { full += payload.content; onChunk(full); }
        } catch {}
      }
    }
    onDone(full);
  } catch (err: any) {
    onError("连接虚空失败：" + (err.message || "unknown error"));
  }
}

export type DocGenPayload = {
  title: string;
  category: string;
  failureReason: string;
  description: string;
  hypothesis?: string;
  methodology?: string;
  lessonLearned?: string;
};

export async function streamDocGeneration(
  payload: DocGenPayload,
  onChunk: (partial: string) => void,
  onDone: (full: string) => void,
  onError: (msg: string) => void
) {
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/ai/generate-doc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) { onError("文档生成失败，请稍后重试。"); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.error) { onError("文档生成出错：" + payload.error); return; }
          if (payload.done) { onDone(full); return; }
          if (payload.content) { full += payload.content; onChunk(full); }
        } catch {}
      }
    }
    onDone(full);
  } catch (err: any) {
    onError("文档生成失败：" + (err.message || "unknown error"));
  }
}

export async function searchPapers(query: string): Promise<Paper[]> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/papers/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.papers ?? [];
}

export async function streamPapersRoast(
  papers: Paper[],
  experimentInfo: { title: string; category: string; failureReason: string },
  onChunk: (partial: string) => void,
  onDone: (full: string) => void,
  onError: (msg: string) => void
) {
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/ai/papers-roast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ papers, ...experimentInfo }),
    });

    if (!res.ok || !res.body) { onError("旁白生成失败"); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.error) { onError(payload.error); return; }
          if (payload.done) { onDone(full); return; }
          if (payload.content) { full += payload.content; onChunk(full); }
        } catch {}
      }
    }
    onDone(full);
  } catch (err: any) {
    onError("旁白生成失败：" + (err.message || "unknown"));
  }
}
