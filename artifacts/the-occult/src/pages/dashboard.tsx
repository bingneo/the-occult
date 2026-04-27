import { Layout } from "@/components/layout";
import { ProtectedRoute, useAuth } from "@/components/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Activity, MessageSquare, Bookmark, BarChart2, Trash2, Edit2,
  AlertTriangle, ChevronLeft, ChevronRight, ThumbsUp, Archive,
  Check, X as XIcon, Loader2, Flag, Flame, CornerDownRight, Monitor,
  User, Mail, CalendarDays, Beaker,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { RESEARCH_FIELDS } from "@/lib/research-fields";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
type Tab = "stats" | "experiments" | "comments" | "collections" | "reports" | "profile";

const CATEGORIES = ["生物学", "化学", "物理学", "心理学", "计算机科学", "数学", "医学", "社会科学", "其他 (Other)"];
const CHART_COLORS = ["#0df0da","#a78bfa","#fb923c","#34d399","#f472b6","#60a5fa","#fbbf24","#f87171"];

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold font-mono">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ── Pagination ────────────────────────────────────────────────────────── */
function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
      <span>共 {total} 条，第 {page}/{totalPages} 页</span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="p-1.5 rounded border border-white/10 hover:border-primary/30 disabled:opacity-30 transition-colors">
          <ChevronLeft size={13} />
        </button>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="p-1.5 rounded border border-white/10 hover:border-primary/30 disabled:opacity-30 transition-colors">
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Confirm delete inline ─────────────────────────────────────────────── */
function ConfirmDelete({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-destructive font-mono">确认删除？</span>
      <button onClick={onConfirm} disabled={loading} className="text-destructive hover:text-destructive/70 transition-colors">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
        <XIcon size={13} />
      </button>
    </div>
  );
}

/* ── Edit experiment modal ─────────────────────────────────────────────── */
interface ExpRow { id: number; title: string; description: string; category: string; failureReason: string; hypothesis?: string | null; methodology?: string | null; lessonLearned?: string | null; createdAt: string; likeCount: number; commentCount: number; collectionCount: number; }

function EditModal({ exp, onClose, onSaved }: { exp: ExpRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: exp.title, description: exp.description, category: exp.category, failureReason: exp.failureReason, hypothesis: exp.hypothesis ?? "", methodology: exp.methodology ?? "", lessonLearned: exp.lessonLearned ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.title.trim() || !form.failureReason.trim()) { setError("标题和失败原因为必填项"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${base}/api/experiments/${exp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      if (!res.ok) { setError("保存失败，请重试"); return; }
      onSaved(); onClose();
    } catch { setError("网络错误"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-xl max-h-[88vh] overflow-y-auto p-6 border border-primary/20">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-primary text-sm uppercase tracking-wider">编辑实验记录</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono">标题 *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-card border-white/[0.08] h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono">描述</label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-card border-white/[0.08] text-sm min-h-[80px] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono">研究领域</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-card border-white/[0.08] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/[0.08]">{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono">失败原因 *</label>
              <Input value={form.failureReason} onChange={e => setForm(f => ({ ...f, failureReason: e.target.value }))} className="bg-card border-white/[0.08] h-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono">假设</label>
            <Textarea value={form.hypothesis} onChange={e => setForm(f => ({ ...f, hypothesis: e.target.value }))} className="bg-card border-white/[0.08] text-sm min-h-[60px] resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono">经验教训</label>
            <Textarea value={form.lessonLearned} onChange={e => setForm(f => ({ ...f, lessonLearned: e.target.value }))} className="bg-card border-white/[0.08] text-sm min-h-[60px] resize-none" />
          </div>
          {error && <p className="text-destructive text-xs font-mono">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm font-mono transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 保存修改
            </button>
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors">取消</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Stats ────────────────────────────────────────────────────────── */
function StatsTab() {
  const { data: s, isLoading } = useQuery<any>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch(`${base}/api/dashboard/stats`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 glass-card" />)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 glass-card" />)}</div>
      <div className="h-52 glass-card" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Experiment stats */}
      <div>
        <h3 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3 font-mono">失败实验</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Archive} label="失败实验" value={s?.experimentCount ?? 0} color="bg-primary/10 text-primary" />
          <StatCard icon={ThumbsUp} label="收到点赞" value={s?.totalLikes ?? 0} color="bg-secondary/10 text-secondary" />
          <StatCard icon={MessageSquare} label="收到评论" value={s?.totalCommentReceived ?? 0} color="bg-violet-500/10 text-violet-400" />
          <StatCard icon={Bookmark} label="我的收藏" value={s?.collectionCount ?? 0} color="bg-amber-500/10 text-amber-400" />
        </div>
      </div>

      {/* Wall / failure post stats */}
      <div>
        <h3 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3 font-mono">失败大屏</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Monitor} label="失败故事" value={s?.failureCount ?? 0} color="bg-orange-500/10 text-orange-400" />
          <StatCard icon={ThumbsUp} label="大屏点赞" value={s?.failureLikeCount ?? 0} color="bg-rose-500/10 text-rose-400" />
          <StatCard icon={MessageSquare} label="大屏评论" value={s?.failureCommentCount ?? 0} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard icon={Flag} label="我的举报" value={s?.reportCount ?? 0} color="bg-red-500/10 text-red-400" />
        </div>
      </div>

      {s?.categoryBreakdown?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-bold mb-4 text-muted-foreground uppercase tracking-widest occult-divider pb-3">实验领域分布</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={s.categoryBreakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e5e7eb" }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(v: any) => [`${v} 个实验`, "数量"]}
              />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {s.categoryBreakdown.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {s?.recentExperiments?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-bold mb-4 text-muted-foreground uppercase tracking-widest occult-divider pb-3">最近失败记录</h3>
          <div className="space-y-3">
            {s.recentExperiments.map((exp: any) => (
              <div key={exp.id} className="flex items-center justify-between gap-4 py-1">
                <Link href={`/experiments/${exp.id}`} className="text-sm text-foreground hover:text-primary transition-colors line-clamp-1 flex-1">
                  <span className="font-mono text-[10px] text-muted-foreground/40 mr-1.5">OCCULT-{exp.id.toString().padStart(4,"0")}</span>
                  {exp.title}
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={11} />{exp.likeCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={11} />{exp.commentCount}</span>
                  <span className="font-mono hidden md:inline">{formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true, locale: zhCN })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s?.experimentCount === 0 && s?.failureCount === 0 && (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">还没有任何失败记录，去创造第一个吧！</div>
      )}
    </div>
  );
}

/* ── Tab: Experiments ──────────────────────────────────────────────────── */
function ExperimentsTab() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [editTarget, setEditTarget] = useState<ExpRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const LIMIT = 10;

  const { data, isLoading } = useQuery<{ experiments: ExpRow[]; total: number }>({
    queryKey: ["dashboard-experiments", page, sortBy],
    queryFn: () => fetch(`${base}/api/dashboard/experiments?page=${page}&limit=${LIMIT}&sortBy=${sortBy}`, { credentials: "include" }).then(r => r.json()),
  });

  const doDelete = async (id: number) => {
    setDeleting(true);
    try {
      await fetch(`${base}/api/experiments/${id}`, { method: "DELETE", credentials: "include" });
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["dashboard-experiments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      {editTarget && <EditModal exp={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["dashboard-experiments"] }); }} />}

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">实验记录 · 共 {data?.total ?? "…"} 条</h2>
        <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-32 bg-card border-white/[0.08] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-white/[0.08]">
            <SelectItem value="newest">最新</SelectItem>
            <SelectItem value="mostLiked">最多点赞</SelectItem>
            <SelectItem value="mostCommented">最多评论</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-24 glass-card" />)}</div>
      ) : data?.experiments.length === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">暂无实验记录</div>
      ) : (
        <div className="space-y-3">
          {data?.experiments.map(exp => (
            <div key={exp.id} className="glass-card p-4 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground/40">OCCULT-{exp.id.toString().padStart(4,"0")}</span>
                    <span className="occult-badge bg-secondary/10 text-secondary text-[10px]">{exp.category}</span>
                  </div>
                  <Link href={`/experiments/${exp.id}`} className="text-sm font-bold hover:text-primary transition-colors line-clamp-1 block mb-2">
                    {exp.title}
                  </Link>
                  <div className="inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full max-w-full">
                    <AlertTriangle size={9} className="shrink-0" />
                    <span className="truncate">{exp.failureReason}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><ThumbsUp size={10} />{exp.likeCount}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={10} />{exp.commentCount}</span>
                    <span className="flex items-center gap-1"><Bookmark size={10} />{exp.collectionCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {deletingId === exp.id ? (
                      <ConfirmDelete onConfirm={() => doDelete(exp.id)} onCancel={() => setDeletingId(null)} loading={deleting} />
                    ) : (
                      <>
                        <button onClick={() => setEditTarget(exp)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded border border-white/10 hover:border-primary/30">
                          <Edit2 size={11} /> 编辑
                        </button>
                        <button onClick={() => setDeletingId(exp.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded border border-white/10 hover:border-destructive/30">
                          <Trash2 size={11} /> 删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/30 font-mono mt-2">
                {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true, locale: zhCN })}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Comments ─────────────────────────────────────────────────────── */
function CommentsTab() {
  const [subTab, setSubTab] = useState<"experiment" | "failure">("experiment");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const LIMIT = 10;

  const isFailure = subTab === "failure";

  const { data, isLoading } = useQuery<{ comments: any[]; total: number }>({
    queryKey: ["dashboard-comments", subTab, page],
    queryFn: () => fetch(
      isFailure
        ? `${base}/api/dashboard/failure-comments?page=${page}&limit=${LIMIT}`
        : `${base}/api/dashboard/comments?page=${page}&limit=${LIMIT}`,
      { credentials: "include" }
    ).then(r => r.json()),
  });

  const doDelete = async (id: number) => {
    setDeleting(true);
    try {
      const endpoint = isFailure
        ? `${base}/api/failures/comments/${id}`
        : `${base}/api/comments/${id}`;
      await fetch(endpoint, { method: "DELETE", credentials: "include" });
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["dashboard-comments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } finally { setDeleting(false); }
  };

  const switchSubTab = (t: "experiment" | "failure") => {
    setSubTab(t);
    setPage(1);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => switchSubTab("experiment")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
            subTab === "experiment"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-white/10 text-muted-foreground hover:border-white/20"
          )}
        >
          <Activity size={11} /> 实验评论
        </button>
        <button
          onClick={() => switchSubTab("failure")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
            subTab === "failure"
              ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
              : "border-white/10 text-muted-foreground hover:border-white/20"
          )}
        >
          <Flame size={11} /> 大屏评论
        </button>
      </div>

      <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
        {isFailure ? "失败大屏评论" : "实验评论"} · 共 {data?.total ?? "…"} 条
      </h2>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 glass-card" />)}</div>
      ) : data?.comments.length === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">暂无评论记录</div>
      ) : (
        <div className="space-y-3">
          {data?.comments.map((c: any) => (
            <div key={c.id} className="glass-card p-4 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Source link */}
                  {isFailure ? (
                    c.failureId && (
                      <Link href={`/wall/${c.failureId}`} className="text-[10px] font-mono text-orange-400/60 hover:text-orange-400 transition-colors block mb-1.5 flex items-center gap-1">
                        <Flame size={9} /> {c.failureTitle}
                      </Link>
                    )
                  ) : (
                    c.experimentTitle && (
                      <Link href={`/experiments/${c.experimentId}`} className="text-[10px] font-mono text-primary/50 hover:text-primary transition-colors block mb-1.5">
                        ↗ {c.experimentTitle}
                      </Link>
                    )
                  )}

                  {/* Reply indicator */}
                  {c.parentId && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 mb-1">
                      <CornerDownRight size={9} /> 回复评论
                    </div>
                  )}

                  <p className="text-sm text-foreground/90 line-clamp-3">{c.content}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/40 font-mono whitespace-nowrap">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: zhCN })}
                  </span>
                  {deletingId === c.id ? (
                    <ConfirmDelete onConfirm={() => doDelete(c.id)} onCancel={() => setDeletingId(null)} loading={deleting} />
                  ) : (
                    <button onClick={() => setDeletingId(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded border border-white/10 hover:border-destructive/30">
                      <Trash2 size={11} /> 删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Collections ──────────────────────────────────────────────────── */
function CollectionsTab() {
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const qc = useQueryClient();
  const LIMIT = 10;

  const { data, isLoading } = useQuery<{ collections: any[]; total: number }>({
    queryKey: ["dashboard-collections", page],
    queryFn: () => fetch(`${base}/api/dashboard/collections?page=${page}&limit=${LIMIT}`, { credentials: "include" }).then(r => r.json()),
  });

  const doRemove = async (id: number) => {
    setRemoving(true);
    try {
      await fetch(`${base}/api/experiments/${id}/collect`, { method: "DELETE", credentials: "include" });
      setRemovingId(null);
      qc.invalidateQueries({ queryKey: ["dashboard-collections"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } finally { setRemoving(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">我的收藏 · 共 {data?.total ?? "…"} 条</h2>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-36 glass-card" />)}</div>
      ) : data?.collections.length === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">还没有收藏任何实验</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data?.collections.map((c: any) => (
            <div key={c.id} className="glass-card p-4 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="occult-badge bg-secondary/10 text-secondary text-[10px]">{c.category}</span>
                {removingId === c.id ? (
                  <ConfirmDelete onConfirm={() => doRemove(c.id)} onCancel={() => setRemovingId(null)} loading={removing} />
                ) : (
                  <button onClick={() => setRemovingId(c.id)} title="取消收藏" className="text-amber-400/60 hover:text-destructive transition-colors">
                    <Bookmark size={13} className="fill-amber-400/60" />
                  </button>
                )}
              </div>
              <Link href={`/experiments/${c.id}`} className="text-sm font-bold hover:text-primary transition-colors line-clamp-2 block mb-2">{c.title}</Link>
              <div className="inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full mb-3">
                <AlertTriangle size={9} className="shrink-0" />
                <span className="truncate">{c.failureReason}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                <span>by {c.authorName}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><ThumbsUp size={10} />{c.likeCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={10} />{c.commentCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Reports ──────────────────────────────────────────────────────── */
function ReportsTab() {
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const { data, isLoading } = useQuery<{ reports: any[]; total: number }>({
    queryKey: ["dashboard-reports", page],
    queryFn: () => fetch(`${base}/api/dashboard/reports?page=${page}&limit=${LIMIT}`, { credentials: "include" }).then(r => r.json()),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Flag size={12} className="text-destructive/60" />
          我的举报记录 · 共 {data?.total ?? "…"} 条
        </h2>
      </div>

      <div className="glass-card p-3 flex items-start gap-2 border border-amber-500/15 bg-amber-500/[0.04]">
        <AlertTriangle size={13} className="text-amber-400/70 shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          此处显示你提交的所有评论举报记录。每条评论每人只能举报一次，举报提交后将由平台进行审核处理。
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 glass-card" />)}</div>
      ) : data?.reports.length === 0 ? (
        <div className="glass-card p-14 text-center space-y-2">
          <Flag size={28} className="text-muted-foreground/20 mx-auto" />
          <p className="text-muted-foreground font-mono text-sm">暂无举报记录</p>
          <p className="text-muted-foreground/40 text-xs">当你在大屏评论区举报不当评论后，记录将显示在这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.reports.map((r: any) => (
            <div key={r.id} className="glass-card p-4 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Failure link */}
                  {r.failureId && (
                    <Link href={`/wall/${r.failureId}`} className="text-[10px] font-mono text-orange-400/60 hover:text-orange-400 transition-colors flex items-center gap-1">
                      <Flame size={9} /> {r.failureTitle}
                    </Link>
                  )}

                  {/* Reported comment */}
                  <div className="pl-3 border-l-2 border-destructive/20">
                    <p className="text-xs text-muted-foreground/50 mb-0.5 font-mono">被举报评论 #{r.commentId}</p>
                    <p className="text-sm text-muted-foreground/70 line-clamp-2 italic">"{r.commentContent}"</p>
                  </div>

                  {/* Report reason */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-destructive/80 bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full">
                      <Flag size={8} /> {r.reportReason}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-muted-foreground/30 font-mono whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: zhCN })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Profile ──────────────────────────────────────────────────────── */
function ProfileTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    researchField: user?.researchField ?? "",
    email: user?.email ?? "",
  });

  const handleEdit = () => {
    setForm({
      displayName: user?.displayName ?? "",
      researchField: user?.researchField ?? "",
      email: user?.email ?? "",
    });
    setError("");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${base}/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: form.displayName,
          researchField: form.researchField || null,
          email: form.email,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "保存失败");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setEditing(false);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const joinedAt = user?.createdAt ? new Date(user.createdAt) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-muted-foreground">个人信息</h2>
        {!editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors font-mono"
          >
            <Edit2 size={12} /> 编辑信息
          </button>
        )}
      </div>

      {!editing ? (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
              {user?.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xl font-bold">{user?.displayName}</div>
              <div className="text-xs text-muted-foreground font-mono">@{user?.username}</div>
              {user?.isAdmin && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">ADMIN</span>
              )}
            </div>
          </div>

          <div className="grid gap-3 pt-2 border-t border-white/[0.05]">
            <InfoRow icon={<Beaker size={14} className="text-primary/60" />} label="研究领域">
              {user?.researchField || <span className="text-muted-foreground/40 italic">未填写</span>}
            </InfoRow>
            <InfoRow icon={<Mail size={14} className="text-primary/60" />} label="邮箱">
              {user?.email || <span className="text-muted-foreground/40 italic">未填写</span>}
            </InfoRow>
            <InfoRow icon={<CalendarDays size={14} className="text-primary/60" />} label="注册时间">
              {joinedAt ? (
                <span>
                  {format(joinedAt, "yyyy 年 MM 月 dd 日", { locale: zhCN })}
                  <span className="text-muted-foreground/50 ml-2 text-xs">
                    ({formatDistanceToNow(joinedAt, { addSuffix: true, locale: zhCN })})
                  </span>
                </span>
              ) : "—"}
            </InfoRow>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-mono mb-1.5 block">显示名称 *</label>
              <Input
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] h-9 text-sm"
                placeholder="你的昵称"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-mono mb-1.5 block">研究领域</label>
              <Select
                value={form.researchField}
                onValueChange={v => setForm(f => ({ ...f, researchField: v }))}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] h-9 text-sm">
                  <SelectValue placeholder="选择研究领域" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/[0.08]">
                  {RESEARCH_FIELDS.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-mono mb-1.5 block">邮箱 *</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] h-9 text-sm"
                placeholder="your@email.com"
              />
            </div>

            {error && <p className="text-destructive text-xs font-mono">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.displayName.trim() || !form.email.trim()}
                className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm font-mono transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                保存修改
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-5 space-y-2">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">账号信息</div>
        <InfoRow icon={<User size={14} className="text-muted-foreground/50" />} label="用户名">
          <span className="font-mono">@{user?.username}</span>
        </InfoRow>
        <InfoRow icon={<Activity size={14} className="text-muted-foreground/50" />} label="累计失败实验">
          {user?.experimentCount ?? 0} 个
        </InfoRow>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm text-foreground/90">{children}</div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");

  const navItems: { id: Tab; label: string; icon: any }[] = [
    { id: "profile",     label: "个人信息", icon: User          },
    { id: "stats",       label: "数据统计", icon: BarChart2     },
    { id: "experiments", label: "实验管理", icon: Activity      },
    { id: "comments",    label: "评论管理", icon: MessageSquare },
    { id: "collections", label: "收藏管理", icon: Bookmark      },
    { id: "reports",     label: "举报管理", icon: Flag          },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Profile header */}
          <div className="glass-card p-6 border border-primary/15 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 text-primary/[0.03] pointer-events-none select-none"><Archive size={200} /></div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-3xl font-bold text-primary glow-primary shrink-0">
                {user?.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold mb-1">{user?.displayName}</h1>
                <div className="text-muted-foreground font-mono text-xs flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span>@{user?.username}</span>
                  <span className="text-primary/30">·</span>
                  <span>{user?.researchField || "研究领域未填写"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar + content */}
          <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start">
            <nav className="glass-card p-2 space-y-0.5 md:sticky md:top-4">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all text-left",
                    tab === id
                      ? id === "reports"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            <div>
              {tab === "profile"     && <ProfileTab />}
              {tab === "stats"       && <StatsTab />}
              {tab === "experiments" && <ExperimentsTab />}
              {tab === "comments"    && <CommentsTab />}
              {tab === "collections" && <CollectionsTab />}
              {tab === "reports"     && <ReportsTab />}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
