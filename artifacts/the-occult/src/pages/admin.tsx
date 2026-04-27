import { Layout } from "@/components/layout";
import { useAuth } from "@/components/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Users, FlaskConical, MessageSquare, Flag, ShieldAlert,
  Trash2, ChevronLeft, ChevronRight, Check, X as XIcon,
  Loader2, ThumbsUp, Crown, UserX, AlertTriangle, Monitor,
  Search, BarChart2, Shield, BadgeCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
type Tab = "stats" | "users" | "failures" | "experiments" | "comments" | "reports";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold font-mono">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

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

function ConfirmDelete({ onConfirm, onCancel, loading, label = "确认删除？" }: { onConfirm: () => void; onCancel: () => void; loading: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-destructive font-mono">{label}</span>
      <button onClick={onConfirm} disabled={loading} className="text-destructive hover:text-destructive/70 transition-colors">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
        <XIcon size={13} />
      </button>
    </div>
  );
}

async function adminDel(path: string) {
  const res = await fetch(`${base}/api${path}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("操作失败");
  return res.json();
}

async function adminPatch(path: string, body: object) {
  const res = await fetch(`${base}/api${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("操作失败");
  return res.json();
}

/* ── Tab: Overview ──────────────────────────────────────────────────────── */
function StatsTab() {
  const { data: s, isLoading } = useQuery<any>({
    queryKey: ["admin-stats"],
    queryFn: () => fetch(`${base}/api/admin/stats`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
      {[1,2,3,4,5].map(i => <div key={i} className="h-20 glass-card" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3 font-mono">平台全局数据</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={Users} label="注册用户" value={s?.users ?? 0} color="bg-primary/10 text-primary" />
          <StatCard icon={FlaskConical} label="失败实验" value={s?.experiments ?? 0} color="bg-violet-500/10 text-violet-400" />
          <StatCard icon={Monitor} label="失败故事" value={s?.failures ?? 0} color="bg-orange-500/10 text-orange-400" />
          <StatCard icon={MessageSquare} label="所有评论" value={s?.comments ?? 0} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard icon={Flag} label="待处理举报" value={s?.reports ?? 0} color="bg-destructive/10 text-destructive" />
        </div>
      </div>

      <div className="glass-card p-5 border-primary/10">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={14} className="text-primary" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-mono">管理员须知</h3>
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground font-mono">
          <li className="flex items-start gap-2"><BadgeCheck size={11} className="text-primary mt-0.5 shrink-0" /> 删除操作不可撤销，请谨慎操作</li>
          <li className="flex items-start gap-2"><BadgeCheck size={11} className="text-primary mt-0.5 shrink-0" /> 删除用户会同时删除其所有内容</li>
          <li className="flex items-start gap-2"><BadgeCheck size={11} className="text-primary mt-0.5 shrink-0" /> 不能删除自己的账号</li>
          <li className="flex items-start gap-2"><BadgeCheck size={11} className="text-primary mt-0.5 shrink-0" /> 举报处理：驳回仅删举报，接受会同时删除被举报评论</li>
        </ul>
      </div>
    </div>
  );
}

/* ── Tab: Users ─────────────────────────────────────────────────────────── */
function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const qc = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading } = useQuery<{ users: any[]; total: number }>({
    queryKey: ["admin-users", page, search],
    queryFn: () => fetch(`${base}/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`, { credentials: "include" }).then(r => r.json()),
  });

  const doSearch = () => { setSearch(searchInput); setPage(1); };

  const doDelete = async (id: number) => {
    setDeleting(true);
    try {
      await adminDel(`/admin/users/${id}`);
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } finally { setDeleting(false); }
  };

  const toggleAdmin = async (id: number, current: boolean) => {
    setTogglingId(id);
    try {
      await adminPatch(`/admin/users/${id}`, { isAdmin: !current });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } finally { setTogglingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="搜索用户名 / 昵称"
            className="pl-8 h-8 text-xs bg-card border-white/[0.08]"
          />
        </div>
        <button onClick={doSearch} className="h-8 px-3 text-xs bg-primary/10 border border-primary/30 text-primary rounded hover:bg-primary/20 transition-colors font-mono">
          搜索
        </button>
        <span className="text-xs text-muted-foreground ml-auto">共 {data?.total ?? "…"} 名用户</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">{[1,2,3,4,5].map(i => <div key={i} className="h-14 glass-card" />)}</div>
      ) : (data?.users?.length ?? 0) === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">未找到用户</div>
      ) : (
        <div className="space-y-2">
          {data?.users.map((u: any) => (
            <div key={u.id} className="glass-card px-4 py-3 flex items-center gap-3 hover:border-white/10 transition-all">
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {u.displayName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/users/${u.id}`} className="text-sm font-bold hover:text-primary transition-colors">{u.displayName}</Link>
                  <span className="text-xs text-muted-foreground font-mono">@{u.username}</span>
                  {u.isAdmin && (
                    <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-mono">
                      <Crown size={9} /> 管理员
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground/40 font-mono mt-0.5">
                  {u.email} · {u.researchField ?? "无领域"} · {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: zhCN })}加入
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {deletingId === u.id ? (
                  <ConfirmDelete onConfirm={() => doDelete(u.id)} onCancel={() => setDeletingId(null)} loading={deleting} />
                ) : (
                  <>
                    <button
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={togglingId === u.id}
                      className={cn(
                        "flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors font-mono",
                        u.isAdmin
                          ? "text-primary border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10"
                          : "text-muted-foreground border-white/10 hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      {togglingId === u.id ? <Loader2 size={11} className="animate-spin" /> : <Shield size={11} />}
                      {u.isAdmin ? "撤销管理" : "设为管理"}
                    </button>
                    <button
                      onClick={() => setDeletingId(u.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded border border-white/10 hover:border-destructive/30 transition-colors"
                    >
                      <UserX size={11} /> 删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Failures (Wall posts) ─────────────────────────────────────────── */
function FailuresTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading } = useQuery<{ failures: any[]; total: number }>({
    queryKey: ["admin-failures", page, search],
    queryFn: () => fetch(`${base}/api/admin/failures?page=${page}&search=${encodeURIComponent(search)}`, { credentials: "include" }).then(r => r.json()),
  });

  const doSearch = () => { setSearch(searchInput); setPage(1); };

  const doDelete = async (id: number) => {
    setDeleting(true);
    try {
      await adminDel(`/admin/failures/${id}`);
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["admin-failures"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="搜索标题"
            className="pl-8 h-8 text-xs bg-card border-white/[0.08]"
          />
        </div>
        <button onClick={doSearch} className="h-8 px-3 text-xs bg-primary/10 border border-primary/30 text-primary rounded hover:bg-primary/20 transition-colors font-mono">
          搜索
        </button>
        <span className="text-xs text-muted-foreground ml-auto">共 {data?.total ?? "…"} 条故事</span>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 glass-card" />)}</div>
      ) : (data?.failures?.length ?? 0) === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">暂无失败故事</div>
      ) : (
        <div className="space-y-3">
          {data?.failures.map((f: any) => (
            <div key={f.id} className="glass-card p-4 flex items-start gap-4 hover:border-white/10 transition-all">
              {f.imageUrl && (
                <img src={f.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 opacity-80" />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/wall/${f.id}`} className="text-sm font-bold hover:text-orange-400 transition-colors line-clamp-1 block mb-1">
                  {f.title}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{f.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40 font-mono">
                  <span>by {f.authorName ?? "未知"}</span>
                  <span>{formatDistanceToNow(new Date(f.createdAt), { addSuffix: true, locale: zhCN })}</span>
                </div>
              </div>
              <div className="shrink-0">
                {deletingId === f.id ? (
                  <ConfirmDelete onConfirm={() => doDelete(f.id)} onCancel={() => setDeletingId(null)} loading={deleting} />
                ) : (
                  <button onClick={() => setDeletingId(f.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded border border-white/10 hover:border-destructive/30 transition-colors">
                    <Trash2 size={11} /> 删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Experiments ───────────────────────────────────────────────────── */
function ExperimentsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading } = useQuery<{ experiments: any[]; total: number }>({
    queryKey: ["admin-experiments", page, search],
    queryFn: () => fetch(`${base}/api/admin/experiments?page=${page}&search=${encodeURIComponent(search)}`, { credentials: "include" }).then(r => r.json()),
  });

  const doSearch = () => { setSearch(searchInput); setPage(1); };

  const doDelete = async (id: number) => {
    setDeleting(true);
    try {
      await adminDel(`/admin/experiments/${id}`);
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["admin-experiments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="搜索标题"
            className="pl-8 h-8 text-xs bg-card border-white/[0.08]"
          />
        </div>
        <button onClick={doSearch} className="h-8 px-3 text-xs bg-primary/10 border border-primary/30 text-primary rounded hover:bg-primary/20 transition-colors font-mono">
          搜索
        </button>
        <span className="text-xs text-muted-foreground ml-auto">共 {data?.total ?? "…"} 条实验</span>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 glass-card" />)}</div>
      ) : (data?.experiments?.length ?? 0) === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">暂无实验记录</div>
      ) : (
        <div className="space-y-3">
          {data?.experiments.map((e: any) => (
            <div key={e.id} className="glass-card p-4 flex items-start gap-4 hover:border-white/10 transition-all">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-muted-foreground/40">OCCULT-{e.id.toString().padStart(4,"0")}</span>
                  <span className="occult-badge bg-secondary/10 text-secondary text-[10px]">{e.category}</span>
                </div>
                <Link href={`/experiments/${e.id}`} className="text-sm font-bold hover:text-primary transition-colors line-clamp-1 block mb-1">
                  {e.title}
                </Link>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                  <span className="flex items-center gap-1"><AlertTriangle size={9} className="text-destructive/60" />{e.failureReason}</span>
                  <span>by {e.authorName ?? "未知"}</span>
                  <span className="flex items-center gap-1"><ThumbsUp size={9} />{e.likeCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={9} />{e.commentCount}</span>
                </div>
              </div>
              <div className="shrink-0">
                {deletingId === e.id ? (
                  <ConfirmDelete onConfirm={() => doDelete(e.id)} onCancel={() => setDeletingId(null)} loading={deleting} />
                ) : (
                  <button onClick={() => setDeletingId(e.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded border border-white/10 hover:border-destructive/30 transition-colors">
                    <Trash2 size={11} /> 删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Comments ──────────────────────────────────────────────────────── */
function CommentsTab() {
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading } = useQuery<{ comments: any[]; total: number }>({
    queryKey: ["admin-comments", page],
    queryFn: () => fetch(`${base}/api/admin/comments?page=${page}`, { credentials: "include" }).then(r => r.json()),
  });

  const doDelete = async (id: number) => {
    setDeleting(true);
    try {
      await adminDel(`/admin/comments/${id}`);
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["admin-comments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">失败大屏评论 · 共 {data?.total ?? "…"} 条</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 glass-card" />)}</div>
      ) : (data?.comments?.length ?? 0) === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">暂无评论</div>
      ) : (
        <div className="space-y-3">
          {data?.comments.map((c: any) => (
            <div key={c.id} className="glass-card p-4 flex items-start gap-4 hover:border-white/10 transition-all">
              <div className="min-w-0 flex-1">
                {c.failureTitle && (
                  <Link href={`/wall/${c.failureId}`} className="text-[10px] font-mono text-orange-400/60 hover:text-orange-400 transition-colors block mb-1.5">
                    ↗ {c.failureTitle}
                  </Link>
                )}
                <p className="text-sm text-foreground/90 line-clamp-3">{c.content}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 font-mono mt-1.5">
                  <span>by {c.authorName ?? "未知"}</span>
                  <span>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: zhCN })}</span>
                </div>
              </div>
              <div className="shrink-0">
                {deletingId === c.id ? (
                  <ConfirmDelete onConfirm={() => doDelete(c.id)} onCancel={() => setDeletingId(null)} loading={deleting} />
                ) : (
                  <button onClick={() => setDeletingId(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded border border-white/10 hover:border-destructive/30 transition-colors">
                    <Trash2 size={11} /> 删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
    </div>
  );
}

/* ── Tab: Reports ───────────────────────────────────────────────────────── */
function ReportsTab() {
  const [page, setPage] = useState(1);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const qc = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading } = useQuery<{ reports: any[]; total: number }>({
    queryKey: ["admin-reports", page],
    queryFn: () => fetch(`${base}/api/admin/reports?page=${page}`, { credentials: "include" }).then(r => r.json()),
  });

  const dismiss = async (id: number) => {
    setLoadingId(id);
    try {
      await adminDel(`/admin/reports/${id}`);
      setDismissingId(null);
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } finally { setLoadingId(null); }
  };

  const deleteComment = async (id: number) => {
    setLoadingId(id);
    try {
      await adminDel(`/admin/reports/${id}/comment`);
      setDeletingCommentId(null);
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } finally { setLoadingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-2">
            <Flag size={12} className="text-destructive" />
            待处理举报 · 共 {data?.total ?? "…"} 条
          </span>
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-24 glass-card" />)}</div>
      ) : (data?.reports?.length ?? 0) === 0 ? (
        <div className="glass-card p-14 text-center text-muted-foreground font-mono text-sm">
          <Flag size={20} className="mx-auto mb-3 opacity-20" />
          暂无举报，平台一片祥和
        </div>
      ) : (
        <div className="space-y-3">
          {data?.reports.map((r: any) => (
            <div key={r.id} className="glass-card p-4 border-destructive/10 hover:border-destructive/20 transition-all">
              {/* Report header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-6 w-6 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Flag size={10} className="text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-destructive font-mono">#{r.id}</span>
                    <span className="text-xs text-muted-foreground">由 <span className="text-foreground/80">{r.reporterName ?? "未知"}</span> 举报</span>
                    <span className="text-[10px] text-muted-foreground/40 font-mono">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: zhCN })}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full font-mono">
                    举报原因：{r.reportReason}
                  </div>
                </div>
              </div>

              {/* Reported comment */}
              <div className="ml-9 space-y-2">
                {r.failureTitle && (
                  <Link href={`/wall/${r.failureId}`} className="text-[10px] font-mono text-orange-400/60 hover:text-orange-400 transition-colors block">
                    ↗ {r.failureTitle}
                  </Link>
                )}
                <div className="bg-card/50 border border-white/[0.05] rounded-lg p-3">
                  <p className="text-sm text-foreground/80 line-clamp-4">{r.commentContent ?? "（评论已被删除）"}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {dismissingId === r.id ? (
                    <ConfirmDelete
                      label="确认驳回举报？"
                      onConfirm={() => dismiss(r.id)}
                      onCancel={() => setDismissingId(null)}
                      loading={loadingId === r.id}
                    />
                  ) : deletingCommentId === r.id ? (
                    <ConfirmDelete
                      label="确认删除评论？"
                      onConfirm={() => deleteComment(r.id)}
                      onCancel={() => setDeletingCommentId(null)}
                      loading={loadingId === r.id}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => setDismissingId(r.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded border border-white/10 hover:border-white/20 transition-colors font-mono"
                      >
                        <XIcon size={11} /> 驳回举报
                      </button>
                      {r.commentContent && (
                        <button
                          onClick={() => setDeletingCommentId(r.id)}
                          className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 px-2.5 py-1.5 rounded border border-destructive/20 hover:border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors font-mono"
                        >
                          <Trash2 size={11} /> 删除评论
                        </button>
                      )}
                    </>
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

/* ── Tab bar ────────────────────────────────────────────────────────────── */
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "stats", label: "概览", icon: BarChart2 },
  { id: "users", label: "用户管理", icon: Users },
  { id: "failures", label: "失败故事", icon: Monitor },
  { id: "experiments", label: "实验管理", icon: FlaskConical },
  { id: "comments", label: "评论管理", icon: MessageSquare },
  { id: "reports", label: "举报处理", icon: Flag },
];

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("stats");

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground font-mono text-sm gap-4">
          <ShieldAlert size={32} className="opacity-20" />
          <p>请先登录</p>
        </div>
      </Layout>
    );
  }

  if (!user.isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground font-mono text-sm gap-4">
          <ShieldAlert size={32} className="opacity-20" />
          <p>权限不足 — 仅管理员可访问此页面</p>
          <button onClick={() => setLocation("/")} className="text-primary hover:underline text-xs">返回首页</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldAlert size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">管理员控制台</h1>
            <p className="text-xs text-muted-foreground font-mono">ADMIN_DASHBOARD // 全平台管理视图</p>
          </div>
          <div className="ml-auto text-[10px] text-primary/50 font-mono border border-primary/10 bg-primary/5 px-2 py-1 rounded">
            <Crown size={10} className="inline mr-1" />
            {user.displayName}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap border transition-all shrink-0",
                tab === t.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
              )}
            >
              <t.icon size={11} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === "stats" && <StatsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "failures" && <FailuresTab />}
          {tab === "experiments" && <ExperimentsTab />}
          {tab === "comments" && <CommentsTab />}
          {tab === "reports" && <ReportsTab />}
        </div>
      </div>
    </Layout>
  );
}
