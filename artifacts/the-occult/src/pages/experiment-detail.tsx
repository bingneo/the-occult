import { Layout } from "@/components/layout";
import { useGetExperiment, useCreateComment, getGetExperimentQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AlertTriangle, ThumbsUp, ThumbsDown, MessageSquare, Terminal, FileText, ExternalLink, PlayCircle, Images, X, ZoomIn, Bookmark, Heart, CornerDownRight, Reply, Tag, Plus, Flag, CheckCircle2, Loader2 as ReportLoader } from "lucide-react";
import { ShareMenu } from "@/components/share-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-context";
import { cn } from "@/lib/utils";

function detectVideoPlatform(url: string): string {
  if (url.includes("bilibili.com") || url.includes("b23.tv")) return "B站";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "视频";
}

function renderAiReport(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="text-primary font-bold text-sm mt-6 mb-2 tracking-widest uppercase border-b border-primary/20 pb-1.5">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="text-primary font-bold text-base mt-5 mb-2 tracking-wide">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, `<code class="bg-primary/10 text-primary px-1 rounded text-[0.8em]">$1</code>`);
    return (
      <p key={i} className="text-foreground/85 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}

export default function ExperimentDetail() {
  const [, params] = useRoute("/experiments/:id");
  const id = Number(params?.id);
  const { user } = useAuth();

  const { data: experiment, isLoading } = useGetExperiment(id, {
    query: { enabled: !!id }
  });

  const createComment = useCreateComment();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [commentVoteState, setCommentVoteState] = useState<Map<number, { upvotes: number; downvotes: number; userVote: number }>>(new Map());
  const [votingId, setVotingId] = useState<number | null>(null);
  const [isCollected, setIsCollected] = useState<boolean | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [localTags, setLocalTags] = useState<{ id: number; name: string }[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (experiment?.tags) setLocalTags(experiment.tags);
  }, [experiment?.tags]);

  useEffect(() => {
    if (experiment && isCollected === null) {
      setIsCollected((experiment as any).isCollected ?? false);
    }
  }, [experiment, isCollected]);

  useEffect(() => {
    if (experiment) {
      setIsLiked((experiment as any).isLiked ?? false);
      setLikeCount((experiment as any).likeCount ?? 0);
    }
  }, [experiment]);

  const handleLike = useCallback(async () => {
    if (!user || isLiking) return;
    setIsLiking(true);
    const next = !isLiked;
    setIsLiked(next);
    setLikeCount(c => next ? c + 1 : c - 1);
    try {
      const res = await fetch(`${base}/api/experiments/${id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        setIsLiked(!next);
        setLikeCount(c => next ? c - 1 : c + 1);
      }
    } catch {
      setIsLiked(!next);
      setLikeCount(c => next ? c - 1 : c + 1);
    } finally {
      setIsLiking(false);
    }
  }, [user, isLiking, isLiked, base, id]);

  const handleCollect = useCallback(async () => {
    if (!user || isCollecting) return;
    setIsCollecting(true);
    const next = !isCollected;
    setIsCollected(next);
    try {
      const method = next ? "POST" : "DELETE";
      const res = await fetch(`${base}/api/experiments/${id}/collect`, {
        method,
        credentials: "include",
      });
      if (!res.ok) setIsCollected(!next);
    } catch {
      setIsCollected(!next);
    } finally {
      setIsCollecting(false);
    }
  }, [user, isCollecting, isCollected, base, id]);

  const handleReplySubmit = useCallback(async (parentId: number) => {
    if (!user || !replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`${base}/api/comments/${parentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(id) });
      }
    } finally {
      setSubmittingReply(false);
    }
  }, [user, replyText, submittingReply, base, id, queryClient]);

  const handleCommentVote = useCallback(async (commentId: number, voteType: 1 | -1) => {
    if (!user || votingId !== null) return;
    setVotingId(commentId);
    try {
      const res = await fetch(`${base}/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ voteType }),
      });
      if (res.ok) {
        const data = await res.json();
        setCommentVoteState(prev => new Map(prev).set(commentId, data));
      }
    } finally {
      setVotingId(null);
    }
  }, [user, votingId, base]);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc, closeLightbox]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    await createComment.mutateAsync({
      data: { content: commentText, experimentId: id } as any
    });
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(id) });
  };

  const handleAddTag = async () => {
    const raw = tagInput.trim().toLowerCase();
    if (!raw || savingTag) return;
    const names = raw.split(/[,，\s]+/).filter(Boolean);
    setSavingTag(true);
    try {
      const res = await fetch(`${base}/api/experiments/${id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tags: names }),
      });
      if (res.ok) {
        const rows = await res.json();
        setLocalTags(rows);
        setTagInput("");
        setAddingTag(false);
      }
    } finally {
      setSavingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      const res = await fetch(`${base}/api/experiments/${id}/tags/${tagId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setLocalTags(prev => prev.filter(t => t.id !== tagId));
    } catch { /* ignore */ }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8 max-w-4xl mx-auto">
          <div className="h-52 glass-card" />
          <div className="h-24 glass-card" />
          <div className="h-64 glass-card" />
        </div>
      </Layout>
    );
  }

  if (!experiment) {
    return (
      <Layout>
        <div className="text-center py-20 text-destructive font-bold text-2xl">
          记录未找到（或者已经彻底炸掉了）
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header card ─────────────────────────────────────────────── */}
        <div className="glass-card p-8 relative overflow-hidden">
          {/* Left accent bar */}
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary/80 via-primary/40 to-transparent" />

          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm pl-4">
            <span className="occult-badge bg-secondary/10 text-secondary">
              {experiment.category}
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-mono">
              <Terminal size={12} />
              OCCULT-{experiment.id.toString().padStart(4, "0")}
            </span>
            <span className="text-muted-foreground text-xs ml-auto">
              {formatDistanceToNow(new Date(experiment.createdAt), { addSuffix: true, locale: zhCN })}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold mb-6 leading-tight pl-4">
            {experiment.title}
          </h1>

          <div className="flex items-center justify-between gap-4 occult-divider pt-5 pl-4">
            <div className="flex items-center gap-3">
              <Link href={`/users/${experiment.authorId}`}>
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base hover:bg-primary/20 transition-colors cursor-pointer">
                  {experiment.authorName.charAt(0).toUpperCase()}
                </div>
              </Link>
              <div>
                <Link href={`/users/${experiment.authorId}`} className="font-bold hover:text-primary transition-colors">
                  {experiment.authorName}
                </Link>
                <div className="text-xs text-muted-foreground">失败实验首席研究员</div>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={isLiking}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono transition-all",
                    isLiked
                      ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
                      : "border-white/10 text-muted-foreground hover:border-primary/40 hover:text-primary"
                  )}
                >
                  <Heart size={14} className={cn(isLiked && "fill-current")} />
                  {likeCount > 0 ? likeCount : "点赞"}
                </button>
                <button
                  type="button"
                  onClick={handleCollect}
                  disabled={isCollecting}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono transition-all",
                    isCollected
                      ? "bg-amber-400/10 border-amber-400/40 text-amber-400 hover:bg-amber-400/20"
                      : "border-white/10 text-muted-foreground hover:border-amber-400/40 hover:text-amber-400"
                  )}
                >
                  <Bookmark
                    size={14}
                    className={cn(isCollected && "fill-amber-400 stroke-amber-400")}
                  />
                  {isCollected ? "已收藏" : "收藏"}
                </button>
                <ShareMenu
                  url={`${window.location.origin}${base}/experiments/${id}`}
                  title={experiment.title}
                  description={experiment.description ?? ""}
                  imageUrl={null}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Tags section ─────────────────────────────────────────────── */}
        {(localTags.length > 0 || user?.id === experiment.authorId) && (
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Tag size={13} className="text-primary/60 shrink-0" />
              {localTags.map(tag => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 text-xs bg-primary/8 border border-primary/20 text-primary/80 px-2.5 py-1 rounded-full font-mono group"
                >
                  <a
                    href={`${import.meta.env.BASE_URL}explore?tag=${encodeURIComponent(tag.name)}`}
                    className="hover:text-primary transition-colors"
                  >
                    #{tag.name}
                  </a>
                  {user?.id === experiment.authorId && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-0.5 opacity-40 hover:opacity-100 text-destructive transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}

              {user?.id === experiment.authorId && (
                addingTag ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } if (e.key === "Escape") { setAddingTag(false); setTagInput(""); } }}
                      placeholder="输入标签，逗号分隔..."
                      autoFocus
                      className="bg-transparent border-b border-primary/40 text-xs font-mono text-primary placeholder:text-muted-foreground/50 outline-none px-1 py-0.5 w-40"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={savingTag || !tagInput.trim()}
                      className="text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                    >
                      {savingTag ? "..." : "确认"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingTag(false); setTagInput(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAddingTag(true); setTimeout(() => tagInputRef.current?.focus(), 50); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors border border-dashed border-white/10 hover:border-primary/30 px-2 py-0.5 rounded-full"
                  >
                    <Plus size={11} /> 添加标签
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Failure reason ──────────────────────────────────────────── */}
        <div className="glass-card border border-destructive/25 p-5 flex items-start gap-4 bg-destructive/5">
          <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-destructive font-bold text-sm mb-1 uppercase tracking-widest">万恶之源</h3>
            <p className="text-destructive/80 font-mono text-base">{experiment.failureReason}</p>
          </div>
        </div>

        {/* ── Content sections ────────────────────────────────────────── */}
        <div className="space-y-5">
          {experiment.aiReport ? (
            <section className="glass-card p-6 md:p-8">
              <h3 className="text-lg font-bold mb-5 text-primary occult-divider pb-3 flex items-center gap-2">
                <FileText size={16} />
                Occy 存档报告
              </h3>
              <div className="font-sans leading-relaxed pt-1">
                {renderAiReport(experiment.aiReport)}
              </div>
            </section>
          ) : (
            <>
              <section className="glass-card p-6 md:p-8">
                <h3 className="text-lg font-bold mb-4 text-primary occult-divider pb-3">灾难现场实录</h3>
                <div className="font-sans text-base leading-relaxed whitespace-pre-wrap text-foreground/90 pt-1">
                  {experiment.description}
                </div>
              </section>

              {experiment.hypothesis && (
                <section className="glass-card p-6 md:p-8 opacity-80 hover:opacity-100 transition-opacity">
                  <h3 className="text-lg font-bold mb-4 text-secondary occult-divider pb-3">原始假设（幻觉阶段）</h3>
                  <div className="font-sans text-base italic border-l-2 border-secondary/40 pl-4 py-2 text-foreground/80 pt-1">
                    "{experiment.hypothesis}"
                  </div>
                </section>
              )}

              {(experiment.methodology || experiment.lessonLearned) && (
                <div className="grid md:grid-cols-2 gap-5">
                  {experiment.methodology && (
                    <section className="glass-card p-6">
                      <h3 className="font-bold mb-3 text-muted-foreground uppercase text-xs tracking-wider">问题方法论</h3>
                      <div className="font-sans whitespace-pre-wrap text-sm leading-relaxed">{experiment.methodology}</div>
                    </section>
                  )}
                  {experiment.lessonLearned && (
                    <section className="glass-card p-6">
                      <h3 className="font-bold mb-3 text-chart-3 uppercase text-xs tracking-wider">经验教训</h3>
                      <div className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-chart-3/90">{experiment.lessonLearned}</div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Image gallery ───────────────────────────────────────────── */}
        {experiment.imagePaths && experiment.imagePaths.length > 0 && (
          <section className="glass-card p-6 md:p-8">
            <h3 className="text-lg font-bold mb-5 text-primary occult-divider pb-3 flex items-center gap-2">
              <Images size={16} />
              实验图片
              <span className="text-muted-foreground text-sm font-normal ml-1">
                （{experiment.imagePaths.length}）
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {experiment.imagePaths.map((path, i) => {
                const src = `${base}/api/storage${path}`;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxSrc(src)}
                    className="block w-full overflow-hidden border border-primary/15 hover:border-primary/40 transition-colors group relative cursor-zoom-in"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-background/30">
                      <img
                        src={src}
                        alt={`实验图片 ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <ZoomIn size={28} className="text-white drop-shadow" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Video links ─────────────────────────────────────────────── */}
        {experiment.videoUrls && experiment.videoUrls.length > 0 && (
          <section className="glass-card p-6 md:p-8">
            <h3 className="text-lg font-bold mb-5 text-primary occult-divider pb-3 flex items-center gap-2">
              <PlayCircle size={16} />
              相关视频
            </h3>
            <div className="space-y-2.5">
              {experiment.videoUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-primary/15 bg-background/20 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                >
                  <span className="text-[9px] font-bold tracking-widest border border-primary/25 text-primary/50 px-1.5 py-0.5 shrink-0 font-mono">
                    {detectVideoPlatform(url)}
                  </span>
                  <span className="font-mono text-xs text-foreground/55 group-hover:text-foreground/80 transition-colors flex-1 truncate">
                    {url}
                  </span>
                  <ExternalLink size={12} className="text-primary/30 group-hover:text-primary transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Comments ────────────────────────────────────────────────── */}
        <div className="mt-6 pt-6 occult-divider">
          {(() => {
            const allComments: any[] = experiment.comments ?? [];
            const topLevel = allComments.filter((c: any) => !c.parentId);
            const totalCount = allComments.length;

            return (
              <>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <MessageSquare className="text-primary" size={18} />
                  同行评审
                  <span className="text-muted-foreground text-sm font-normal ml-1">
                    ({totalCount})
                  </span>
                </h3>

                {/* ── Top-level comment form ── */}
                {user ? (
                  <form onSubmit={handleCommentSubmit} className="mb-8 flex flex-col items-end gap-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="送上慰问，或者调侃一下他的方法论……"
                      className="w-full glass-card p-4 font-mono text-sm min-h-[100px] focus:outline-none focus:border-primary/40 transition-colors resize-none border border-white/[0.07]"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-5 py-2 rounded-full font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
                      disabled={createComment.isPending}
                    >
                      提交评论
                    </button>
                  </form>
                ) : (
                  <div className="mb-8 glass-card p-4 text-center text-muted-foreground text-sm border border-dashed border-white/[0.08]">
                    请先<a href="/auth" className="text-primary underline mx-1">登录</a>后再参与评论
                  </div>
                )}

                {/* ── Comment threads ── */}
                <div className="space-y-4">
                  {topLevel.map((comment: any) => {
                    const replies = allComments.filter((c: any) => c.parentId === comment.id);
                    const vs = commentVoteState.get(comment.id) ?? { upvotes: comment.upvotes ?? 0, downvotes: comment.downvotes ?? 0, userVote: comment.userVote ?? 0 };
                    const isVoting = votingId === comment.id;
                    const isReplying = replyingTo === comment.id;

                    return (
                      <div key={comment.id} className="glass-card p-5 space-y-4">
                        {/* ── Parent comment ── */}
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <Link href={`/users/${comment.authorId}`}>
                              <div className="h-7 w-7 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-xs font-bold text-secondary hover:bg-secondary/20 transition-colors cursor-pointer shrink-0">
                                {comment.authorName.charAt(0).toUpperCase()}
                              </div>
                            </Link>
                            <div className="min-w-0">
                              <Link href={`/users/${comment.authorId}`} className="font-bold text-sm hover:text-primary transition-colors">
                                {comment.authorName}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN })}
                              </div>
                            </div>
                          </div>
                          <p className="font-sans text-sm text-foreground/80 pl-10 leading-relaxed">{comment.content}</p>
                          <div className="flex items-center gap-4 pl-10 mt-3 pt-3 border-t border-white/[0.05]">
                            <button
                              type="button"
                              disabled={!user || isVoting}
                              onClick={() => handleCommentVote(comment.id, 1)}
                              title={user ? "认同这个失败" : "登录后才能点赞"}
                              className={cn(
                                "flex items-center gap-1.5 text-xs transition-colors disabled:cursor-not-allowed",
                                vs.userVote === 1 ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"
                              )}
                            >
                              <ThumbsUp size={13} className={vs.userVote === 1 ? "fill-primary" : ""} />
                              <span>{vs.upvotes > 0 ? vs.upvotes : "认同"}</span>
                            </button>
                            <button
                              type="button"
                              disabled={!user || isVoting}
                              onClick={() => handleCommentVote(comment.id, -1)}
                              title={user ? "不认同这个说法" : "登录后才能点踩"}
                              className={cn(
                                "flex items-center gap-1.5 text-xs transition-colors disabled:cursor-not-allowed",
                                vs.userVote === -1 ? "text-destructive font-bold" : "text-muted-foreground hover:text-destructive"
                              )}
                            >
                              <ThumbsDown size={13} className={vs.userVote === -1 ? "fill-destructive" : ""} />
                              <span>{vs.downvotes > 0 ? vs.downvotes : "不认同"}</span>
                            </button>
                            {user && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(isReplying ? null : comment.id);
                                    setReplyText("");
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 text-xs transition-colors ml-auto",
                                    isReplying ? "text-primary" : "text-muted-foreground hover:text-primary"
                                  )}
                                >
                                  <Reply size={13} />
                                  {isReplying ? "取消" : `回复${replies.length > 0 ? ` (${replies.length})` : ""}`}
                                </button>
                                {user.id !== comment.authorId && (
                                  <button
                                    type="button"
                                    onClick={() => setReportingCommentId(comment.id)}
                                    className={cn(
                                      "flex items-center gap-1 text-xs transition-colors",
                                      reportedIds.has(comment.id)
                                        ? "text-green-500/60 cursor-default"
                                        : "text-muted-foreground/50 hover:text-destructive/70"
                                    )}
                                    disabled={reportedIds.has(comment.id)}
                                    title={reportedIds.has(comment.id) ? "已举报" : "举报此评论"}
                                  >
                                    {reportedIds.has(comment.id) ? <CheckCircle2 size={12} /> : <Flag size={12} />}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* ── Replies ── */}
                        {replies.length > 0 && (
                          <div className="pl-4 border-l-2 border-primary/15 space-y-3 ml-3">
                            {replies.map((reply: any) => (
                              <div key={reply.id} className="flex gap-2.5">
                                <CornerDownRight size={14} className="text-primary/25 shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <Link href={`/users/${reply.authorId}`}>
                                      <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer shrink-0">
                                        {reply.authorName.charAt(0).toUpperCase()}
                                      </div>
                                    </Link>
                                    <Link href={`/users/${reply.authorId}`} className="text-xs font-bold hover:text-primary transition-colors">
                                      {reply.authorName}
                                    </Link>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: zhCN })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-foreground/75 leading-relaxed font-sans pl-7">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Inline reply form ── */}
                        {isReplying && (
                          <div className="pl-4 border-l-2 border-primary/30 ml-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-primary/70 font-mono mb-1">
                              <CornerDownRight size={12} />
                              回复 {comment.authorName}
                            </div>
                            <textarea
                              autoFocus
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="写下你的回复……"
                              className="w-full glass-card p-3 font-mono text-sm min-h-[72px] focus:outline-none focus:border-primary/40 transition-colors resize-none border border-primary/20 bg-primary/[0.03]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                  e.preventDefault();
                                  handleReplySubmit(comment.id);
                                }
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => { setReplyingTo(null); setReplyText(""); }}
                                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                disabled={submittingReply || !replyText.trim()}
                                onClick={() => handleReplySubmit(comment.id)}
                                className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 px-4 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-40"
                              >
                                {submittingReply ? "提交中…" : "提交回复"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {topLevel.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground italic text-sm">
                      一片寂静。连来嘲讽的人都没有。
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>

      </div>

      {/* ── Lightbox overlay ─────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-md"
          onClick={closeLightbox}
        >
          {/* Toolbar */}
          <div
            className="flex justify-end gap-2 p-4 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <a
              href={lightboxSrc}
              target="_blank"
              rel="noopener noreferrer"
              title="在新标签页查看原图"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/15"
            >
              <ExternalLink size={13} />
              查看原图
            </a>
            <button
              type="button"
              onClick={closeLightbox}
              title="关闭（ESC）"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/15"
            >
              <X size={13} />
              关闭
            </button>
          </div>

          {/* Image area — click backdrop to close, click image to stay */}
          <div
            className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0"
          >
            <img
              src={lightboxSrc}
              alt="实验图片放大"
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* ESC hint */}
          <div className="text-center pb-3 text-white/25 text-xs font-mono shrink-0 select-none">
            点击背景或按 ESC 关闭
          </div>
        </div>
      )}

      {/* ── Comment Report Modal ── */}
      {reportingCommentId !== null && (
        <ReportCommentModal
          commentId={reportingCommentId}
          base={base}
          onClose={() => setReportingCommentId(null)}
          onReported={(id) => {
            setReportedIds(prev => new Set([...prev, id]));
            setReportingCommentId(null);
            toast({ title: "举报已提交", description: "感谢你的反馈，我们会尽快审核。" });
          }}
        />
      )}

    </Layout>
  );
}

function ReportCommentModal({ commentId, base, onClose, onReported }: {
  commentId: number;
  base: string;
  onClose: () => void;
  onReported: (id: number) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/api/comments/${commentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ report_reason: reason.trim() }),
      });
      if (res.ok) {
        onReported(commentId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm bg-[#0d0d12] border border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-mono">
            <Flag size={14} className="text-destructive/70" />
            举报评论
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            请说明举报原因，我们会尽快处理。
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="请描述问题（如垃圾信息、人身攻击、违规内容等）……"
          rows={4}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none outline-none focus:border-primary/30 transition-colors leading-relaxed"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/[0.10] text-muted-foreground/60 hover:text-foreground text-xs transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="px-4 py-2 rounded-lg bg-destructive/15 border border-destructive/25 text-destructive hover:bg-destructive hover:text-white disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs transition-all"
          >
            {submitting ? <ReportLoader size={13} className="animate-spin" /> : "提交举报"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
