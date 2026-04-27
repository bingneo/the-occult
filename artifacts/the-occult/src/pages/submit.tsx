import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateExperiment } from "@workspace/api-client-react";
import { ProtectedRoute } from "@/components/auth-context";
import { ParticleBg } from "@/components/particle-bg";
import { cn } from "@/lib/utils";
import {
  streamAiReply,
  streamDocGeneration,
  searchPapers,
  streamPapersRoast,
  type ChatMessage,
  type Paper,
} from "@/hooks/use-ai-chat";
import { useAuth } from "@/components/auth-context";
import { AI_NAME } from "@/lib/ai-name";

type Message = {
  id: string;
  sender: "void" | "user";
  text: string;
  streaming?: boolean;
};

type SubmitStep =
  | "title" | "failure_reason" | "description"
  | "hypothesis" | "methodology" | "lesson"
  | "confirm" | "submitting" | "done";

type DocStatus = "idle" | "generating" | "ready" | "error";
type PapersStatus = "idle" | "loading" | "ready" | "error";

const STEPS: SubmitStep[] = [
  "title", "failure_reason", "description",
  "hypothesis", "methodology", "lesson", "confirm",
];

export default function Submit() {
  return <ProtectedRoute><SubmitTerminal /></ProtectedRoute>;
}

function detectVideoPlatform(url: string): string {
  if (url.includes("bilibili.com") || url.includes("b23.tv")) return "B站";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "视频";
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="text-primary font-bold text-xs mt-5 mb-1.5 tracking-widest uppercase border-b border-primary/20 pb-1">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="text-primary font-bold text-sm mt-4 mb-2 tracking-widest">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, `<code class="bg-primary/10 text-primary px-1 text-[10px]">$1</code>`);
    return (
      <p key={i} className="text-foreground/80 text-xs leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}

function SubmitTerminal() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateExperiment();
  const { user } = useAuth();

  const researchField = user?.researchField || "Other";

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<SubmitStep>("submitting");
  const [inputValue, setInputValue] = useState("");
  const [formData, setFormData] = useState({
    title: "", category: researchField, failureReason: "",
    description: "", hypothesis: "", methodology: "", lessonLearned: "",
  });

  const [docStatus, setDocStatus] = useState<DocStatus>("idle");
  const [docText, setDocText] = useState("");
  const [docTextEdited, setDocTextEdited] = useState("");
  const [copied, setCopied] = useState(false);

  const [papersStatus, setPapersStatus] = useState<PapersStatus>("idle");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [papersRoast, setPapersRoast] = useState("");
  const [papersRoastDone, setPapersRoastDone] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);

  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleImageUpload = async (files: FileList) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");

    const toUpload = Array.from(files).slice(0, 5 - imagePaths.length);
    if (toUpload.length === 0) return;

    setImageUploading(true);
    setImageUploadError(null);

    for (const file of toUpload) {
      if (!ALLOWED.includes(file.type)) {
        setImageUploadError(`"${file.name}" 类型不支持，仅允许 JPEG / PNG / WebP / GIF`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setImageUploadError(`"${file.name}" 超过 5MB，请压缩后重试`);
        continue;
      }
      try {
        const res = await fetch(`${base}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "未知错误" }));
          setImageUploadError(err.error || "获取上传 URL 失败");
          continue;
        }
        const { uploadURL, objectPath } = await res.json();
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) {
          setImageUploadError(`"${file.name}" 上传失败，请重试`);
          continue;
        }
        setImagePaths((prev) => [...prev, objectPath]);
      } catch {
        setImageUploadError("上传失败，请检查网络连接");
      }
    }

    setImageUploading(false);
  };

  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  const handleVideoUpload = async (files: FileList) => {
    const ALLOWED = ["video/mp4", "video/webm", "video/mov", "video/quicktime"];
    const MAX_SIZE = 100 * 1024 * 1024;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");

    const toUpload = Array.from(files).slice(0, 3 - videoUrls.length);
    if (toUpload.length === 0) return;

    setVideoUploading(true);
    setVideoUploadError(null);

    for (const file of toUpload) {
      if (!ALLOWED.includes(file.type)) {
        setVideoUploadError(`"${file.name}" 类型不支持，仅允许 MP4 / WebM`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setVideoUploadError(`"${file.name}" 超过 100MB，请压缩后重试`);
        continue;
      }
      try {
        const res = await fetch(`${base}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "未知错误" }));
          setVideoUploadError(err.error || "获取上传 URL 失败");
          continue;
        }
        const { uploadURL, objectPath } = await res.json();
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) {
          setVideoUploadError(`"${file.name}" 上传失败，请重试`);
          continue;
        }
        const servingUrl = `${base}/api/storage${objectPath}`;
        setVideoUrls((prev) => [...prev, servingUrl]);
      } catch {
        setVideoUploadError("上传失败，请检查网络连接");
      }
    }

    setVideoUploading(false);
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const docBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docEditRef = useRef<HTMLTextAreaElement>(null);

  const addUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: Math.random().toString(), sender: "user", text }]);
  };

  const streamReply = useCallback((
    prompt: string,
    history: ChatMessage[],
    callback: (reply: string) => void
  ) => {
    const msgId = Math.random().toString();
    setMessages((prev) => [...prev, { id: msgId, sender: "void", text: "▋", streaming: true }]);
    const nextHistory: ChatMessage[] = [...history, { role: "user", content: prompt }];
    streamAiReply(
      nextHistory, "confession",
      (partial) => setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, text: partial + " ▋" } : m)),
      (full) => {
        setMessages((prev) =>
          prev.map((m) => m.id === msgId ? { ...m, text: full, streaming: false } : m));
        setChatHistory([...nextHistory, { role: "assistant", content: full }]);
        callback(full);
      },
      (fallback) => {
        setMessages((prev) =>
          prev.map((m) => m.id === msgId ? { ...m, text: fallback, streaming: false } : m));
        callback(fallback);
      }
    );
  }, []);

  const generateDoc = useCallback((data: typeof formData) => {
    setDocStatus("generating");
    setDocText("");
    streamDocGeneration(
      { title: data.title, category: data.category, failureReason: data.failureReason,
        description: data.description, hypothesis: data.hypothesis || undefined,
        methodology: data.methodology || undefined, lessonLearned: data.lessonLearned || undefined },
      (partial) => {
        setDocText(partial);
        docBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      },
      (full) => {
        setDocStatus("ready");
        setDocTextEdited(full);
      },
      () => setDocStatus("error")
    );
  }, []);

  const fetchPapersAndRoast = useCallback(async (data: typeof formData) => {
    setPapersStatus("loading");
    setPapersRoast("");
    setPapersRoastDone(false);
    try {
      const query = `${data.title} ${data.category} ${data.failureReason}`;
      const found = await searchPapers(query);
      setPapers(found);
      if (found.length === 0) {
        setPapersStatus("ready");
        setPapersRoast("连相关文献都找不到……看来这个坑你是第一个跳进去的。");
        setPapersRoastDone(true);
        return;
      }
      setPapersStatus("ready");
      streamPapersRoast(
        found,
        { title: data.title, category: data.category, failureReason: data.failureReason },
        (partial) => setPapersRoast(partial),
        () => setPapersRoastDone(true),
        () => { setPapersRoast("文献点评生成失败，但论文是真实的。"); setPapersRoastDone(true); }
      );
    } catch {
      setPapersStatus("error");
    }
  }, []);

  const doPublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const result = await createMutation.mutateAsync({
        data: {
          title: formData.title, category: formData.category,
          failureReason: formData.failureReason, description: formData.description,
          hypothesis: formData.hypothesis || undefined,
          methodology: formData.methodology || undefined,
          lessonLearned: formData.lessonLearned || undefined,
          aiReport: docTextEdited || undefined,
          videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
          imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
        },
      });
      setStep("done");
      setTimeout(() => setLocation(`/experiments/${result.id}`), 1800);
    } catch (err: any) {
      setIsPublishing(false);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: "void",
          text: `发布失败了：${err.message || "未知错误"}。不过你的失败记录就是为了记录失败的，稍后重试吧。` }
      ]);
    }
  }, [formData, docTextEdited, videoUrls, imagePaths, createMutation, setLocation]);

  useEffect(() => {
    streamReply(
      `向用户打招呼，说明这是失败实验存档系统CONFESSION_TERMINAL。用户注册时填写的研究领域是"${researchField}"——请用你的风格幽默地调侃一下这个领域（比如这个领域特别容易失败、或者这个领域的人特别擅长自我安慰之类的），然后说"好了，告诉我你的实验叫什么名字"。`,
      [], () => setStep("title")
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (step !== "submitting" && step !== "done" && step !== "confirm") {
      setTimeout(() => (inputRef.current ?? textareaRef.current)?.focus(), 100);
    }
  }, [messages, step]);

  const handleInput = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val || step === "submitting" || step === "done" || step === "confirm") return;

    addUserMessage(val);
    setInputValue("");
    setStep("submitting");
    const currentHistory = chatHistory;

    switch (step) {
      case "title":
        if (val.length < 5) {
          streamReply(`用户的实验名称太短了："${val}"，请幽默地要求他们多说几个字。`, currentHistory, () => setStep("title"));
          return;
        }
        setFormData((p) => ({ ...p, title: val }));
        streamReply(
          `实验名叫"${val}"，请用你的风格评价或回应这个名字（可以联系用户的研究领域"${researchField}"做一个幽默的关联），然后让他们用一句话总结主要失败原因是什么。`,
          currentHistory, () => setStep("failure_reason")
        );
        break;

      case "failure_reason":
        if (val.length < 3) {
          streamReply(`失败原因太简短了，请幽默地要求更诚实的回答。`, currentHistory, () => setStep("failure_reason"));
          return;
        }
        setFormData((p) => ({ ...p, failureReason: val }));
        streamReply(
          `失败原因是："${val}"。请用你的风格共情或幽默地评价，然后让用户详细描述当时发生了什么（越详细越好）。`,
          currentHistory, () => setStep("description")
        );
        break;

      case "description":
        if (val.length < 20) {
          streamReply(`描述太短了，这段失败值得更详细的记录，请鼓励用户多说一点。`, currentHistory, () => setStep("description"));
          return;
        }
        setFormData((p) => ({ ...p, description: val }));
        streamReply(
          `灾难描述："${val.slice(0, 100)}${val.length > 100 ? "..." : ""}"。请用你的风格回应，然后问用户当初的假设是什么（如果成功了会怎样？），并说明他们可以按 Esc 键跳过这个问题。`,
          currentHistory, () => setStep("hypothesis")
        );
        break;

      case "hypothesis": {
        const hypo = val === "跳过" || val.toLowerCase() === "skip" ? "" : val;
        setFormData((p) => ({ ...p, hypothesis: hypo }));
        streamReply(
          hypo
            ? `假设是："${hypo}"。请简短回应，然后问他们用了什么方法/走了哪些弯路（按 Esc 可跳过）。`
            : `用户跳过了假设。请用你的风格回应，然后问他们用了什么方法/走了哪些弯路（按 Esc 可跳过）。`,
          currentHistory, () => setStep("methodology")
        );
        break;
      }

      case "methodology": {
        const method = val === "跳过" || val.toLowerCase() === "skip" ? "" : val;
        setFormData((p) => ({ ...p, methodology: method }));
        streamReply(
          method
            ? `方法是："${method}"。请简短评价，然后问他们从这次失败中学到了什么（按 Esc 可跳过）。`
            : `用户跳过了方法。请用你的风格回应，然后问他们从这次失败中学到了什么（按 Esc 可跳过）。`,
          currentHistory, () => setStep("lesson")
        );
        break;
      }

      case "lesson": {
        const lesson = val === "跳过" || val.toLowerCase() === "skip" ? "" : val;
        const final = { ...formData, lessonLearned: lesson };
        setFormData(final);
        generateDoc(final);
        fetchPapersAndRoast(final);
        streamReply(
          `所有信息收集完毕！实验标题："${final.title}"，领域：${final.category}。告诉用户AI正在右侧生成完整的失败报告和相关文献，他们可以在右侧编辑报告后点击"确认发布"按钮进行发布。用你的风格说一句鼓励的话。`,
          currentHistory, () => setStep("confirm")
        );
        break;
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(docTextEdited).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isInputDisabled = step === "submitting" || step === "done" || step === "confirm";
  const isMultiline = step === "description" || step === "hypothesis" || step === "methodology" || step === "lesson";
  const SKIPPABLE_STEPS: SubmitStep[] = ["hypothesis", "methodology", "lesson"];
  const isSkippable = SKIPPABLE_STEPS.includes(step);

  const handleSkip = useCallback(() => {
    if (!isSkippable || isInputDisabled) return;
    addUserMessage("（跳过）");
    setInputValue("");
    setStep("submitting");
    const currentHistory = chatHistory;

    if (step === "hypothesis") {
      setFormData((p) => ({ ...p, hypothesis: "" }));
      streamReply(
        `用户按 Esc 跳过了假设。请用你的风格幽默地回应，然后问他们用了什么方法/走了哪些弯路（按 Esc 可跳过）。`,
        currentHistory, () => setStep("methodology")
      );
    } else if (step === "methodology") {
      setFormData((p) => ({ ...p, methodology: "" }));
      streamReply(
        `用户按 Esc 跳过了方法。请用你的风格幽默地回应，然后问他们从这次失败中学到了什么（按 Esc 可跳过）。`,
        currentHistory, () => setStep("lesson")
      );
    } else if (step === "lesson") {
      const final = { ...formData, lessonLearned: "" };
      setFormData(final);
      generateDoc(final);
      fetchPapersAndRoast(final);
      streamReply(
        `所有信息收集完毕！实验标题："${final.title}"，领域：${final.category}。告诉用户AI正在右侧生成完整的失败报告和相关文献，他们可以在右侧编辑报告后点击"确认发布"按钮进行发布。用你的风格说一句鼓励的话。`,
        currentHistory, () => setStep("confirm")
      );
    }
  }, [step, isSkippable, isInputDisabled, chatHistory, formData, streamReply, generateDoc, fetchPapersAndRoast]);

  const FIELD_LABELS: { key: keyof typeof formData; label: string; optional?: boolean; auto?: boolean }[] = [
    { key: "title", label: "实验标题" },
    { key: "category", label: "研究领域", auto: true },
    { key: "failureReason", label: "失败原因" },
    { key: "description", label: "灾难经过" },
    { key: "hypothesis", label: "原始假设", optional: true },
    { key: "methodology", label: "研究方法", optional: true },
    { key: "lessonLearned", label: "经验教训", optional: true },
  ];

  const showLivePreview = docStatus === "idle" && FIELD_LABELS.some((f) => formData[f.key]);

  return (
    <div className="h-screen bg-background font-mono text-primary selection:bg-primary selection:text-background overflow-hidden relative flex flex-col">
      <ParticleBg />

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-primary/15 relative z-10">
        <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-primary transition-colors text-xs mr-2">
          ← 返回
        </button>
        <span className="text-primary font-bold tracking-widest text-xs">CONFESSION_TERMINAL</span>
        <span className="text-muted-foreground text-xs opacity-40">// {AI_NAME} 失败存档系统</span>
        <div className="ml-auto flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("w-1.5 h-1.5 transition-colors",
              STEPS.indexOf(step) >= i ? "bg-primary" : "bg-primary/15")} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* LEFT: Conversation */}
        <div className="w-[52%] flex flex-col border-r border-primary/10">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "max-w-[90%] p-3",
                  msg.sender === "void"
                    ? "bg-card border-l-2 border-primary text-foreground self-start"
                    : "bg-primary/10 border-r-2 border-primary text-primary self-end text-right ml-auto",
                  msg.streaming && "border-secondary"
                )}>
                  <div className="text-[10px] mb-1 opacity-40 font-bold tracking-widest">
                    {msg.sender === "void" ? AI_NAME : "你"}
                  </div>
                  <div className="whitespace-pre-wrap text-xs leading-relaxed">{msg.text}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 px-5 py-3 border-t border-primary/10">
            {!isInputDisabled && (
              isMultiline ? (
                <form onSubmit={handleInput}>
                  <div className="bg-card border border-primary/25 focus-within:border-primary transition-colors">
                    <div className="flex items-start p-2.5 gap-2">
                      <span className="text-primary font-bold mt-0.5 shrink-0 text-sm">{">"}</span>
                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInput(e as any); }
                          if (e.key === "Escape" && isSkippable) { e.preventDefault(); handleSkip(); }
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none text-xs leading-relaxed"
                        placeholder="在这里输入……（Shift+Enter 换行，Enter 发送）"
                        rows={3} autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-between px-2.5 pb-2">
                      {isSkippable ? (
                        <button
                          type="button"
                          onClick={handleSkip}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border hover:border-primary px-2 py-0.5 tracking-widest"
                        >
                          ESC 跳过
                        </button>
                      ) : <span />}
                      <button type="submit" className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-background font-bold transition-colors text-xs tracking-widest">
                        发送
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleInput} className="flex gap-2 items-center bg-card border border-primary/25 px-2.5 py-2 focus-within:border-primary transition-colors">
                  <span className="text-primary font-bold text-sm">{">"}</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-xs"
                    placeholder="在这里输入..."
                    autoFocus autoComplete="off"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-background font-bold transition-colors text-xs tracking-widest">
                    发送
                  </button>
                </form>
              )
            )}
            {step === "submitting" && (
              <div className="text-secondary text-xs animate-pulse text-center py-1">{AI_NAME} 正在思考...</div>
            )}
            {step === "confirm" && docStatus !== "ready" && (
              <div className="text-primary/40 text-[10px] text-center py-1 tracking-widest">{AI_NAME} 正在右侧生成报告，请稍候…</div>
            )}
            {step === "done" && (
              <div className="text-primary text-xs text-center py-1 tracking-widest">[ 存档完成 — 跳转中... ]</div>
            )}
          </div>
        </div>

        {/* RIGHT: Document Preview */}
        <div className="w-[48%] flex flex-col bg-card/20">
          {/* Right header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-primary/60">
                {docStatus === "idle" ? "草稿预览" :
                 docStatus === "generating" ? "报告生成中..." :
                 docStatus === "ready" ? "报告就绪" : "生成失败"}
              </span>
              {docStatus === "generating" && <span className="text-secondary text-xs animate-pulse">▋</span>}
              {docStatus === "ready" && <span className="text-primary/30 text-[10px]">// 可直接编辑后发布</span>}
            </div>
            {docStatus === "ready" && (
              <button onClick={handleCopy}
                className="text-[10px] tracking-widest px-2 py-0.5 border border-primary/25 text-primary/50 hover:text-primary hover:border-primary transition-colors">
                {copied ? "已复制 ✓" : "复制"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

            {/* Idle — no data */}
            {docStatus === "idle" && !showLivePreview && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-20">
                <div className="text-3xl">📄</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  在左侧填写实验信息<br />右侧将实时整理并生成完整报告
                </div>
              </div>
            )}

            {/* Live field cards */}
            {showLivePreview && (
              <div className="space-y-2">
                <div className="text-[10px] text-primary/30 tracking-widest">// LIVE_DRAFT</div>
                {FIELD_LABELS.map((f) => {
                  const value = formData[f.key];
                  if (!value) return null;
                  return (
                    <div key={f.key} className="border border-primary/12 bg-background/20 p-2.5">
                      <div className="text-[10px] text-primary/40 font-bold tracking-widest mb-1 flex items-center gap-1.5">
                        <span className="text-primary/60">■</span>
                        {f.label.toUpperCase()}
                        {f.auto && <span className="text-secondary/60 font-normal text-[9px] border border-secondary/30 px-1">AUTO</span>}
                        {f.optional && <span className="text-muted-foreground font-normal">opt</span>}
                      </div>
                      <p className="text-foreground/70 text-[11px] leading-relaxed line-clamp-2">{value}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Generating: show streaming rendered doc */}
            {docStatus === "generating" && (
              <div className="space-y-0.5">
                {renderMarkdown(docText)}
                <span className="text-secondary text-sm animate-pulse">▋</span>
                <div ref={docBottomRef} />
              </div>
            )}

            {/* Ready: editable textarea */}
            {docStatus === "ready" && (
              <>
                <textarea
                  ref={docEditRef}
                  value={docTextEdited}
                  onChange={(e) => setDocTextEdited(e.target.value)}
                  className="w-full bg-background/30 border border-primary/15 focus:border-primary/40 outline-none text-foreground/80 text-[11px] leading-relaxed p-3 resize-none font-mono transition-colors"
                  style={{ minHeight: "280px", height: "auto" }}
                  rows={Math.max(15, docTextEdited.split("\n").length + 2)}
                />

                {/* Papers section */}
                {papersStatus !== "idle" && (
                  <div className="border border-primary/10 bg-background/20">
                    <div className="px-3 py-2 border-b border-primary/10 flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-primary/50">相关文献</span>
                      {papersStatus === "loading" && <span className="text-secondary text-[10px] animate-pulse">// 检索中…</span>}
                      {papersStatus === "ready" && papers.length > 0 && (
                        <span className="text-primary/30 text-[10px]">// {papers.length} 篇前人踩坑记录</span>
                      )}
                    </div>

                    {papersStatus === "loading" && (
                      <div className="px-3 py-4 text-center text-[10px] text-muted-foreground animate-pulse">
                        正在检索相关文献…
                      </div>
                    )}

                    {papersStatus === "ready" && (
                      <div className="px-3 py-2 space-y-2">
                        {papers.length > 0 && (
                          <div className="space-y-1.5">
                            {papers.map((p, i) => (
                              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                                className="block group hover:bg-primary/5 p-1.5 transition-colors -mx-1.5">
                                <div className="text-[10px] text-primary/40 mb-0.5">
                                  [{i + 1}] {p.authors.slice(0, 2).join(", ")}{p.authors.length > 2 ? " et al." : ""}{p.year ? ` (${p.year})` : ""}
                                </div>
                                <div className="text-[11px] text-foreground/70 group-hover:text-primary transition-colors leading-snug">
                                  {p.title}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Roast commentary */}
                        {papersRoast && (
                          <div className="border-t border-primary/10 pt-2 mt-1">
                            <div className="text-[10px] text-secondary/60 font-bold tracking-widest mb-1">{AI_NAME.toUpperCase()} 点评</div>
                            <p className="text-[11px] text-foreground/60 leading-relaxed whitespace-pre-wrap">
                              {papersRoast}
                              {!papersRoastDone && <span className="text-secondary animate-pulse">▋</span>}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 补充材料 */}
                <div className="border border-primary/10 bg-background/20">
                  <div className="px-3 py-2 border-b border-primary/10">
                    <span className="text-[10px] font-bold tracking-widest text-primary/50">补充材料</span>
                  </div>

                  {/* 图片区 */}
                  <div className="px-3 py-2.5 space-y-2 border-b border-primary/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-primary/40">// 图片（选填，≤5 张，每张 ≤5MB）</span>
                      {imagePaths.length < 5 && !imageUploading && (
                        <label className="cursor-pointer text-[10px] tracking-widest border border-primary/20 text-primary/50 hover:border-primary/50 hover:text-primary/80 transition-colors px-2 py-0.5 select-none">
                          + 选择图片
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                          />
                        </label>
                      )}
                      {imageUploading && (
                        <span className="text-[10px] text-primary/50 animate-pulse tracking-widest">上传中...</span>
                      )}
                    </div>

                    {imageUploadError && (
                      <div className="text-[10px] text-destructive/70 font-mono">{imageUploadError}</div>
                    )}

                    {imagePaths.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {imagePaths.map((path, i) => {
                          const base = import.meta.env.BASE_URL.replace(/\/$/, "");
                          return (
                            <div key={i} className="relative group shrink-0">
                              <img
                                src={`${base}/api/storage${path}`}
                                alt={`图片 ${i + 1}`}
                                className="w-16 h-16 object-cover border border-primary/20"
                              />
                              <button
                                type="button"
                                onClick={() => setImagePaths((prev) => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-background/85 text-foreground/60 hover:text-destructive text-[11px] leading-none flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {imagePaths.length >= 5 && (
                      <div className="text-[10px] text-muted-foreground/35">// 已达上限（5 张）</div>
                    )}
                  </div>

                  {/* 视频上传区 */}
                  <div className="px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-primary/40">// 视频（选填，≤3 个，每个 ≤100MB，MP4/WebM）</span>
                      {videoUrls.length < 3 && !videoUploading && (
                        <label className="cursor-pointer text-[10px] tracking-widest border border-primary/20 text-primary/50 hover:border-primary/50 hover:text-primary/80 transition-colors px-2 py-0.5 select-none">
                          + 选择视频
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/mov,video/quicktime"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && handleVideoUpload(e.target.files)}
                          />
                        </label>
                      )}
                      {videoUploading && (
                        <span className="text-[10px] text-primary/50 animate-pulse tracking-widest">上传中...</span>
                      )}
                    </div>

                    {videoUploadError && (
                      <div className="text-[10px] text-destructive/70 font-mono">{videoUploadError}</div>
                    )}

                    {videoUrls.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        {videoUrls.map((url, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[9px] font-bold tracking-widest border border-primary/20 text-primary/50 px-1.5 py-0.5 shrink-0">视频 {i + 1}</span>
                            <span className="font-mono text-[10px] text-foreground/50 flex-1 truncate">{url.split("/").pop()}</span>
                            <button
                              type="button"
                              onClick={() => setVideoUrls((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors text-xs px-1 shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {videoUrls.length >= 3 && (
                      <div className="text-[10px] text-muted-foreground/35">// 已达上限（3 个）</div>
                    )}
                  </div>
                </div>

                {/* Confirm publish button */}
                {step !== "done" && (
                  <button
                    onClick={doPublish}
                    disabled={isPublishing || imageUploading || videoUploading}
                    className={cn(
                      "w-full py-3 font-bold tracking-widest text-sm transition-all border",
                      isPublishing || imageUploading || videoUploading
                        ? "bg-primary/10 text-primary/40 border-primary/20 cursor-not-allowed"
                        : "bg-primary text-background hover:bg-primary/90 border-primary"
                    )}
                  >
                    {isPublishing ? "发布中..." : imageUploading ? "图片上传中..." : videoUploading ? "视频上传中..." : "确认发布"}
                  </button>
                )}
              </>
            )}

            {/* Error */}
            {docStatus === "error" && (
              <div className="border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive/80">
                <div className="font-bold mb-1">文档生成失败</div>
                <p>文档生成失败，但实验数据已保存，仍可正常发布。</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => generateDoc(formData)}
                    className="px-3 py-1 border border-destructive/30 hover:bg-destructive/10 transition-colors text-[10px] tracking-widest">
                    重试文档
                  </button>
                  <button onClick={doPublish} disabled={isPublishing}
                    className="px-3 py-1 border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[10px] tracking-widest">
                    {isPublishing ? "发布中..." : "直接发布"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
