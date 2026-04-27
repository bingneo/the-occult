import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ParticleBg } from "@/components/particle-bg";
import { cn } from "@/lib/utils";
import { streamAiReply, type ChatMessage } from "@/hooks/use-ai-chat";
import { FlaskConical } from "lucide-react";
import { Link } from "wouter";
import { AI_NAME } from "@/lib/ai-name";
import { type WallRant, INITIAL_WALL_RANTS } from "@/lib/rant-wall";
import { RESEARCH_FIELDS } from "@/lib/research-fields";

type Message = {
  id: string;
  sender: "void" | "user";
  text: string;
  streaming?: boolean;
};

type AuthState =
  | "initial"
  | "login_username"
  | "login_password"
  | "register_username"
  | "register_password"
  | "register_display"
  | "register_field"
  | "register_email"
  | "submitting";

const RANTS = [
  { avatar: "🐼", name: "熊猫博士", text: "科研的尽头就是玄学，不信你试试" },
  { avatar: "🦊", name: "野生研究员", text: "成功没什么了不起，失败才是我们的日常" },
  { avatar: "🐸", name: "青蛙选手", text: "p=0.051，我的一生之敌" },
  { avatar: "🦉", name: "熬夜猫头鹰", text: "导师说再改改，这已经是第87遍了" },
  { avatar: "🐙", name: "八脚打工仔", text: "同学已经发了Nature，我还在跑样品" },
  { avatar: "🐰", name: "焦虑兔子", text: "三年博士，全在对付审稿人" },
  { avatar: "🦑", name: "墨迹学者", text: "数据丢了，备份也没了，重跑吧" },
  { avatar: "🐨", name: "困倦考拉", text: "组会PPT做到天亮，结论是「再看看」" },
  { avatar: "🐳", name: "深海研究员", text: "实验结果完美，但我知道那只是运气" },
  { avatar: "🦁", name: "倔强狮子", text: "本来以为找到了规律，结果是噪声" },
  { avatar: "🐺", name: "独狼科研", text: "仪器坏了，维修要三个月，先摆了" },
  { avatar: "🐯", name: "愤怒老虎", text: "拒稿信写得比我的论文好看" },
  { avatar: "🦋", name: "迷途蝴蝶", text: "答辩延期了，又是新的一年" },
  { avatar: "🐬", name: "乐观海豚", text: "凌晨三点实验室，陪我的只有液氮声" },
  { avatar: "🦔", name: "多刺刺猬", text: "外审意见完全反对，直接改结论吗？" },
  { avatar: "🐻", name: "憨厚熊", text: "五年博士一篇SCI，我值了" },
  { avatar: "🦝", name: "浣熊学长", text: "师兄说这方法成熟，两年了还没跑通" },
  { avatar: "🐮", name: "老实研究牛", text: "经费不够了，实验先暂停暂停" },
  { avatar: "🐧", name: "南极博后", text: "成功的秘诀是不停失败直到运气来了" },
  { avatar: "🦀", name: "横行研究员", text: "我的模型还在收敛，猫都会走路了" },
  { avatar: "🐸", name: "突变青蛙", text: "重复性实验，我一个人跑了三百次" },
  { avatar: "🦊", name: "狡猾狐狸", text: "审稿人说方法创新不够，你来写" },
  { avatar: "🐼", name: "卷王熊猫", text: "别人在发文章，我在陪仪器等故障恢复" },
  { avatar: "🦉", name: "哲学猫头鹰", text: "读了一圈文献，发现别人全做完了" },
];

/* ── Pure helper: no logic, only maps state → placeholder text ── */
function getPlaceholder(state: AuthState): string {
  switch (state) {
    case "initial":             return "输入 1（登录）或 2（注册）";
    case "login_username":
    case "register_username":   return "输入用户名";
    case "login_password":
    case "register_password":   return "输入密码";
    case "register_display":    return "输入昵称（显示名）";
    case "register_field":      return `输入 1–${RESEARCH_FIELDS.length} 选择研究领域`;
    case "register_email":      return "输入邮箱地址（必填）";
    default:                    return "在这里输入...";
  }
}

const FIELD_LIST_TEXT = RESEARCH_FIELDS.map((f, i) => `${i + 1}. ${f}`).join("\n");

export default function Auth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false } });

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [authState, setAuthState] = useState<AuthState>("submitting");
  const [inputValue, setInputValue] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    researchField: "",
    email: "",
  });

  /* ── Rant wall (read-only on auth page) ── */
  const wallRants = INITIAL_WALL_RANTS;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserLoading && user) setLocation("/");
  }, [user, isUserLoading, setLocation]);

  const addUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: Math.random().toString(), sender: "user", text }]);
  };

  const streamVoidReply = (
    prompt: string,
    history: ChatMessage[],
    callback: (reply: string) => void
  ) => {
    const msgId = Math.random().toString();
    setMessages((prev) => [...prev, { id: msgId, sender: "void", text: "▋", streaming: true }]);

    const nextHistory: ChatMessage[] = [...history, { role: "user", content: prompt }];

    streamAiReply(
      nextHistory,
      "void",
      (partial) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: partial + " ▋" } : m))
        );
      },
      (full) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: full, streaming: false } : m))
        );
        setChatHistory([...nextHistory, { role: "assistant", content: full }]);
        callback(full);
      },
      (fallback) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: fallback, streaming: false } : m))
        );
        callback(fallback);
      }
    );
  };

  useEffect(() => {
    streamVoidReply(
      `你叫 ${AI_NAME}，是 The Occult 的科研失败记录伴侣。向用户自我介绍叫 ${AI_NAME}，告诉他们这是The Occult失败实验分享平台——专门记录那些"不应该发生但一直在发生"的科研灾难。然后问他们：已是失败老手？还是准备加入？让他们输入1登录，输入2注册。`,
      [],
      () => setAuthState("initial")
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (authState !== "submitting") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, authState]);

  const handleInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authState === "submitting") return;
    if (!inputValue.trim() && authState !== "register_email") return;

    const val = inputValue.trim();
    const maskedVal = authState.includes("password") ? "*".repeat(val.length) : val;
    addUserMessage(val === "" ? "（跳过）" : maskedVal);
    setInputValue("");
    setAuthState("submitting");

    const currentHistory = chatHistory;

    switch (authState) {
      case "initial":
        if (val === "1" || val.toLowerCase() === "login") {
          streamVoidReply(
            `用户选择了登录。请用你的风格欢迎这位回归的失败老手，然后询问用户名。`,
            currentHistory,
            () => setAuthState("login_username")
          );
        } else if (val === "2" || val.toLowerCase() === "register") {
          streamVoidReply(
            `用户选择了注册。请用你的风格欢迎这个新加入失败大家庭的新成员，然后让他们选择一个用户名。`,
            currentHistory,
            () => setAuthState("register_username")
          );
        } else {
          streamVoidReply(
            `用户输入了"${val}"，这不是有效的选项。请讽刺地提醒他们输入1登录或2注册。`,
            currentHistory,
            () => setAuthState("initial")
          );
        }
        break;

      case "login_username":
        setFormData((p) => ({ ...p, username: val }));
        streamVoidReply(
          `用户的用户名是"${val}"。请用你的风格回应，然后要求输入密码。`,
          currentHistory,
          () => setAuthState("login_password")
        );
        break;

      case "login_password":
        try {
          await loginMutation.mutateAsync({ data: { username: formData.username, password: val } });
          streamVoidReply(
            `登录验证通过了！请用你的风格表示欢迎，告诉用户即将跳转。`,
            currentHistory,
            () => {
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              setTimeout(() => setLocation("/"), 1800);
            }
          );
        } catch (err: any) {
          streamVoidReply(
            `登录失败了，密码或用户名不对。请用你的风格嘲讽一下这个失败，然后让用户重新输入用户名。`,
            currentHistory,
            () => {
              setAuthState("login_username");
            }
          );
        }
        break;

      case "register_username":
        setFormData((p) => ({ ...p, username: val }));
        streamVoidReply(
          `用户选择了用户名"${val}"。请评价一下这个名字（用黑色幽默），然后要求设置密码。`,
          currentHistory,
          () => setAuthState("register_password")
        );
        break;

      case "register_password":
        setFormData((p) => ({ ...p, password: val }));
        streamVoidReply(
          `用户设置了密码（已加密，不显示）。请回应，然后询问他们想要的显示名称。`,
          currentHistory,
          () => setAuthState("register_display")
        );
        break;

      case "register_display":
        setFormData((p) => ({ ...p, displayName: val }));
        streamVoidReply(
          `用户的显示名称是"${val}"。请回应，然后给用户展示以下研究领域列表，让他们输入对应数字选择自己的领域：\n${FIELD_LIST_TEXT}\n请用你的风格介绍一下这些领域都有哪些独特的失败体验，然后让他们输入 1–${RESEARCH_FIELDS.length} 的数字。`,
          currentHistory,
          () => setAuthState("register_field")
        );
        break;

      case "register_field": {
        const fieldNum = parseInt(val, 10);
        if (isNaN(fieldNum) || fieldNum < 1 || fieldNum > RESEARCH_FIELDS.length) {
          streamVoidReply(
            `用户输入了"${val}"，这不是 1–${RESEARCH_FIELDS.length} 的有效数字。用你的风格提醒他们必须从列表中选一个数字，重新展示列表：\n${FIELD_LIST_TEXT}`,
            currentHistory,
            () => setAuthState("register_field")
          );
          break;
        }
        const selectedField = RESEARCH_FIELDS[fieldNum - 1];
        setFormData((p) => ({ ...p, researchField: selectedField }));
        streamVoidReply(
          `用户选择了第 ${fieldNum} 项：${selectedField}。用你的风格调侃一下这个领域的辛酸，然后告诉他们邮箱是必填项，以便收到评论通知，请输入有效邮箱地址。`,
          currentHistory,
          () => setAuthState("register_email")
        );
        break;
      }

      case "register_email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val || !emailRegex.test(val)) {
          streamVoidReply(
            `用户输入了"${val || "（空）"}"，这不是有效的邮箱地址。邮箱是必填项，用你的风格提醒他们输入一个正确格式的邮箱。`,
            currentHistory,
            () => setAuthState("register_email")
          );
          break;
        }
        try {
          await registerMutation.mutateAsync({
            data: {
              username: formData.username,
              password: formData.password,
              displayName: formData.displayName,
              researchField: formData.researchField || undefined,
              email: val,
            },
          });
          streamVoidReply(
            `注册成功！邮箱"${val}"已记录，被人评论时会收到通知。请用你的风格庆祝他们正式加入失败者俱乐部，告诉他们即将跳转。`,
            currentHistory,
            () => {
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              setTimeout(() => setLocation("/"), 1800);
            }
          );
        } catch (err: any) {
          const msg = err?.response?.data?.error || err?.message || "未知错误";
          streamVoidReply(
            `注册失败了：${msg}。请用你的风格回应这个失败，让用户从头再来。`,
            currentHistory,
            () => setAuthState("initial")
          );
        }
        break;
      }
    }
  };

  /* Ticker: loop all rants in a single line */
  const tickerText = RANTS.map((r) => `${r.avatar} ${r.name}: ${r.text}`).join("   ·   ");

  /* ──────────────────────────────────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen bg-background font-mono overflow-hidden relative flex flex-col">
      <ParticleBg />

      {/* ── Ambient background glows ──────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[700px] h-[400px] rounded-full bg-primary/8 blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 translate-y-1/3 w-[500px] h-[300px] rounded-full bg-secondary/6 blur-[70px]" />
        <div className="absolute inset-0 opacity-[0.025] select-none blur-[0.5px]">
          <div className="flex flex-col animate-[rantScroll_120s_linear_infinite] text-primary text-[11px] tracking-wide leading-8">
            {[...RANTS, ...RANTS, ...RANTS].map((r, i) => (
              <span key={i} className="px-8 whitespace-nowrap">
                {r.avatar} {r.name}: {r.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Back-to-home corner link ───────────────────────────────────── */}
      <div className="absolute top-4 left-5 z-20">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-primary transition-colors text-xs"
        >
          <FlaskConical size={13} />
          <span className="tracking-widest">THE_OCCULT</span>
        </Link>
      </div>

      {/* ── Main two-column content area ──────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center gap-5 px-4 lg:px-8 py-16 min-h-0">

        {/* ── AI Panel ──────────────────────────────────────────────────── */}
        <div
          className="w-full max-w-[480px] flex flex-col shrink-0"
          style={{ height: "min(600px, calc(100vh - 5rem))" }}
        >
          <div className="glass-panel flex flex-col overflow-hidden flex-1 shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(13,240,218,0.06)]">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 occult-divider shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                  <FlaskConical size={16} className="text-primary" />
                </div>
                <div>
                  <div className="font-bold text-sm gradient-text tracking-widest">{AI_NAME.toUpperCase()}_TERMINAL</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5 opacity-60">
                    系统 v0.9 &nbsp;//&nbsp; {AI_NAME} 在线中...
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
            </div>

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 items-start",
                    msg.sender === "user" && "flex-row-reverse"
                  )}
                >
                  {msg.sender === "void" ? (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <FlaskConical size={12} className="text-primary" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-secondary">
                      你
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[82%]",
                      msg.sender === "void"
                        ? cn(
                            "bg-white/[0.04] border border-white/[0.08] text-foreground",
                            msg.streaming && "border-secondary/30"
                          )
                        : "bg-primary/12 border border-primary/20 text-primary ml-auto"
                    )}
                  >
                    <div className="text-[9px] opacity-40 mb-1.5 font-bold tracking-widest uppercase">
                      {msg.sender === "void" ? AI_NAME.toUpperCase() : "YOU"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input area — inside the panel */}
            <div className="px-5 pb-5 pt-3 shrink-0 space-y-2">
              {authState !== "submitting" ? (
                <form
                  onSubmit={handleInput}
                  className="flex gap-3 items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 focus-within:border-primary/35 transition-colors"
                >
                  <span className="text-primary font-bold text-lg shrink-0 select-none leading-none">›</span>
                  <input
                    ref={inputRef}
                    type={authState.includes("password") ? "password" : "text"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 text-sm"
                    placeholder={getPlaceholder(authState)}
                    onKeyDown={(_e) => {}}
                    autoFocus
                    autoComplete={
                      authState.includes("username") ? "username" :
                      authState.includes("password") ? "current-password" :
                      authState === "register_email" ? "email" : "off"
                    }
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary hover:bg-primary hover:text-primary-foreground font-bold transition-all text-xs shrink-0"
                  >
                    发送
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 text-secondary/70 text-xs px-1 py-3">
                  <span className="animate-bounce inline-block">●</span>
                  <span className="animate-bounce inline-block delay-100">●</span>
                  <span className="animate-bounce inline-block delay-200">●</span>
                  <span className="ml-1.5 opacity-70">{AI_NAME} 正在思考...</span>
                </div>
              )}

              {authState === "register_email" && (
                <p className="text-[10px] text-muted-foreground/40 px-1 leading-relaxed">
                  邮箱为必填项 &nbsp;·&nbsp; 用于接收评论通知
                </p>
              )}
              {authState === "login_password" && (
                <div className="text-center">
                  <a
                    href={`${import.meta.env.BASE_URL}forgot-password`}
                    className="text-[10px] text-muted-foreground/40 hover:text-primary/60 transition-colors font-mono underline underline-offset-2"
                  >
                    忘记密码？
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom ticker tape */}
          <div className="mt-3 overflow-hidden opacity-25">
            <div
              className="text-[10px] text-muted-foreground font-mono whitespace-nowrap"
              style={{ animation: "rantTicker 60s linear infinite" }}
            >
              {tickerText}&nbsp;&nbsp;&nbsp;{tickerText}
            </div>
          </div>
        </div>

        {/* ── Rant Wall — hidden on mobile, shown on lg+ ────────────────── */}
        <div
          className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0"
          style={{ height: "min(600px, calc(100vh - 5rem))" }}
        >
          <div className="glass-panel flex flex-col overflow-hidden flex-1 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">

            {/* Rant wall header */}
            <div className="px-5 py-4 occult-divider shrink-0">
              <div className="text-xs font-bold text-foreground/80 tracking-widest uppercase">吐槽墙</div>
              <div className="text-[10px] text-muted-foreground/50 mt-0.5">科研难民实时崩溃播报</div>
            </div>

            {/* Auto-scrolling rant list */}
            <div className="flex-1 overflow-hidden relative min-h-0">
              {/* Fade gradients */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 z-10"
                style={{ background: "linear-gradient(to bottom, hsl(222 22% 10% / 0.9) 0%, transparent 100%)" }} />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-10"
                style={{ background: "linear-gradient(to top, hsl(222 22% 10% / 0.9) 0%, transparent 100%)" }} />

              {/* Scrolling track — doubled for seamless loop, pause on hover */}
              <div
                key={wallRants.length}
                className="flex flex-col px-4 pt-3 gap-3"
                style={{
                  animation: `wallScroll ${wallRants.length * 3}s linear infinite`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
                onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
              >
                {[...wallRants, ...wallRants].map((rant, i) => (
                  <div
                    key={`${rant.id}-${i}`}
                    className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10] transition-colors shrink-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base leading-none">{rant.avatar}</span>
                      <span className="text-[11px] font-bold text-foreground/70 flex-1 truncate">{rant.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/8 text-primary/60 border border-primary/12 font-mono shrink-0">
                        {rant.field}
                      </span>
                    </div>
                    <p className="text-[12px] text-foreground/75 leading-relaxed">{rant.text}</p>
                    <div className="mt-2 text-[9px] text-muted-foreground/35">{rant.time}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes rantScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-66.66%); }
        }
        @keyframes wallScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes rantTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .bg-primary\/12 { background-color: color-mix(in srgb, hsl(174 90% 50%) 12%, transparent); }
        .bg-primary\/8  { background-color: color-mix(in srgb, hsl(174 90% 50%) 8%, transparent); }
      `}</style>
    </div>
  );
}
