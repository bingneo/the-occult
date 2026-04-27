import { useEffect, useRef, useState, useCallback } from "react";
import { useListExperiments, useGetStatsOverview, useGetTrendingExperiments } from "@workspace/api-client-react";
import { ExperimentCard } from "@/components/experiment-card";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { AlertTriangle, Users, MessageSquare, Flame, ScrollText, MessageSquarePlus, X } from "lucide-react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

type WallRant = { id: string; avatar: string; name: string; field: string; text: string; time: string };

export default function Home() {
  const { data: listData, isLoading } = useListExperiments();
  const { data: stats } = useGetStatsOverview();
  const { data: trending } = useGetTrendingExperiments();

  const [wallRants, setWallRants] = useState<WallRant[]>([]);
  const [showRantModal, setShowRantModal] = useState(false);
  const [rantInput, setRantInput] = useState("");
  const [rantSubmitting, setRantSubmitting] = useState(false);
  const rantTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`${base}/api/rants`)
      .then(r => r.json())
      .then(d => { if (d.rants) setWallRants(d.rants); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showRantModal) setTimeout(() => rantTextareaRef.current?.focus(), 50);
  }, [showRantModal]);

  const submitRant = useCallback(async () => {
    if (!rantInput.trim() || rantSubmitting) return;
    setRantSubmitting(true);
    try {
      const res = await fetch(`${base}/api/rants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: rantInput.trim() }),
      });
      if (res.ok) {
        const newRant = await res.json();
        setWallRants(prev => [newRant, ...prev]);
      }
    } catch {}
    setRantInput("");
    setShowRantModal(false);
    setRantSubmitting(false);
  }, [rantInput, rantSubmitting]);

  return (
    <Layout>
      <div className="space-y-12">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="py-20 flex flex-col items-center text-center">
          <div className="mb-3 text-xs tracking-[0.3em] text-primary/60 font-mono uppercase">
            破碎假设的避难所
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight gradient-text">
            THE OCCULT
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl font-mono mb-10 leading-relaxed">
            "失败是成功TA妈，我来帮你避坑"
          </p>
          <div className="flex gap-3">
            <Link
              href="/submit"
              className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(13,240,218,0.25)]"
            >
              投稿失败
            </Link>
            <Link
              href="/explore"
              className="border border-white/[0.12] px-7 py-2.5 rounded-full font-bold text-sm hover:border-primary/40 hover:bg-white/[0.04] transition-all"
            >
              浏览失败库
            </Link>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<AlertTriangle className="text-destructive" size={20} />}
              value={stats.totalExperiments}
              label="失败实验"
            />
            <StatCard
              icon={<Users className="text-primary" size={20} />}
              value={stats.totalUsers}
              label="科研难民"
            />
            <StatCard
              icon={<MessageSquare className="text-secondary" size={20} />}
              value={stats.totalComments}
              label="同情留言"
            />
            <StatCard
              icon={<Flame className="text-chart-4" size={20} />}
              value={stats.mostActiveResearchField || "未知"}
              label="最活跃领域"
              isText
            />
          </section>
        )}

        {/* ── Feed + Sidebar ────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Main feed */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-primary font-mono">///</span> 最新失败
            </h2>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 glass-card animate-pulse" />
                ))}
              </div>
            ) : listData?.experiments.length === 0 ? (
              <div className="text-center py-20 glass-card text-muted-foreground font-mono text-sm">
                还没有失败实验？你真的在搞科研吗？
              </div>
            ) : (
              <div className="grid gap-4">
                {listData?.experiments.map((exp) => (
                  <ExperimentCard key={exp.id} experiment={exp} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Trending */}
            <div className="glass-card p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                <Flame size={16} className="text-chart-4" />
                热门失败秀
              </h3>
              <div className="space-y-4">
                {trending?.map((exp) => (
                  <Link key={exp.id} href={`/experiments/${exp.id}`} className="block group">
                    <div className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2 mb-1 leading-snug">
                      {exp.title}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="text-secondary">{exp.category}</span>
                      <span className="opacity-40">·</span>
                      <span>{exp.likeCount} 认同</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Rant wall ── */}
            <div className="space-y-3">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <ScrollText size={16} className="text-primary" />
                吐槽墙
              </h3>

              <div
                className="glass-panel flex flex-col border border-primary/10"
                style={{ height: "460px" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 occult-divider shrink-0">
                  <div className="text-[10px] text-muted-foreground/50">科研难民实时崩溃播报</div>
                  <button
                    onClick={() => setShowRantModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-[10px] font-bold shrink-0"
                  >
                    <MessageSquarePlus size={10} />
                    发布吐槽
                  </button>
                </div>

                {/* Auto-scrolling list */}
                <div className="flex-1 overflow-hidden relative min-h-0">
                  <div
                    className="pointer-events-none absolute top-0 left-0 right-0 h-10 z-10"
                    style={{ background: "linear-gradient(to bottom, hsl(222 22% 10% / 0.9) 0%, transparent 100%)" }}
                  />
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-10"
                    style={{ background: "linear-gradient(to top, hsl(222 22% 10% / 0.9) 0%, transparent 100%)" }}
                  />
                  <div
                    key={wallRants.length}
                    className="flex flex-col px-4 pt-3 gap-3"
                    style={{ animation: `wallScroll ${wallRants.length * 3}s linear infinite` }}
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
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/[0.08] text-primary/60 border border-primary/[0.12] font-mono shrink-0">
                            {rant.field}
                          </span>
                        </div>
                        <p className="text-[12px] text-foreground/75 leading-relaxed">{rant.text}</p>
                        <div className="mt-2 text-[9px] text-muted-foreground/35">{rant.time}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 occult-divider shrink-0">
                  <button
                    onClick={() => setShowRantModal(true)}
                    className="w-full py-2 rounded-xl border border-dashed border-primary/20 text-primary/40 hover:border-primary/40 hover:text-primary/70 transition-all text-[11px] font-bold tracking-wide"
                  >
                    + 记录你的崩溃瞬间
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rant submit modal ── */}
      {showRantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRantModal(false)}
          />
          <div className="relative glass-panel w-full max-w-sm p-6 shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(13,240,218,0.08)] z-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="font-bold text-sm gradient-text tracking-widest">发布吐槽</div>
                <div className="text-[10px] text-muted-foreground/50 mt-1">把你的崩溃留在这里</div>
              </div>
              <button
                onClick={() => setShowRantModal(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.10] transition-all"
              >
                <X size={13} />
              </button>
            </div>

            <textarea
              ref={rantTextareaRef}
              value={rantInput}
              onChange={(e) => setRantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitRant(); }
                if (e.key === "Escape") setShowRantModal(false);
              }}
              placeholder={"第 7 次重复实验，结果像随机数生成器。\n导师说再试一次，我的细胞说不。\n阳性对照阴了，阴性对照阳了，人生也灰了。"}
              rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none outline-none focus:border-primary/30 transition-colors leading-relaxed mb-4"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-muted-foreground/35">Ctrl+Enter 快速发布</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRantModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/[0.10] text-muted-foreground/60 hover:text-foreground text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={submitRant}
                  disabled={!rantInput.trim() || rantSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary/15 border border-primary/25 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs transition-all"
                >
                  {rantSubmitting ? "发送中…" : "吐槽一下"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wallScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </Layout>
  );
}

function StatCard({
  icon,
  value,
  label,
  isText = false,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="glass-card p-5 flex flex-col items-center text-center gap-2">
      {icon}
      <div className={`font-bold leading-tight ${isText ? "text-sm text-chart-4 uppercase tracking-wider truncate w-full" : "text-3xl"}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
