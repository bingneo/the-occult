import { Layout } from "@/components/layout";
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import { useAuth } from "@/components/auth-context";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Heart, MessageCircle, ArrowLeft, Loader2, Send,
  AlertTriangle, Flame, CornerDownRight, Reply, Flag, CheckCircle2
} from "lucide-react";
import { ShareMenu } from "@/components/share-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const REPORT_REASONS = [
  "垃圾信息 / 广告",
  "含有攻击性或仇恨言论",
  "侮辱或骚扰他人",
  "色情或不当内容",
  "侵犯个人隐私",
  "其他原因",
];

interface FailurePost {
  id: number; title: string; description: string;
  imageUrl: string | null; videoUrl: string | null;
  userId: number; authorName: string;
  likeCount: number; commentCount: number; isLiked: boolean;
  createdAt: string;
}

interface Comment {
  id: number; content: string; userId: number;
  parentId: number | null; authorName: string; createdAt: string;
}

function isYouTubeUrl(url: string) { return /youtu\.?be/.test(url); }
function isBilibiliUrl(url: string) { return /bilibili\.com|b23\.tv/.test(url); }
function getYouTubeEmbedUrl(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function getBilibiliEmbedUrl(url: string) {
  const m = url.match(/BV[\w]+/);
  return m ? `https://player.bilibili.com/player.html?bvid=${m[0]}&autoplay=0` : null;
}

/* ── Report Modal ─────────────────────────────────────────────────────── */
function ReportModal({
  commentId,
  open,
  onClose,
  onSuccess,
}: {
  commentId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: (commentId: number) => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  const reason = selected === "其他原因" ? custom.trim() : selected;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/failures/comments/${commentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_reason: reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "举报失败", variant: "destructive" });
        return;
      }
      onSuccess(commentId);
      onClose();
      toast({ title: "举报已提交，感谢你的反馈" });
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm bg-card border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="font-mono text-destructive flex items-center gap-2 text-base">
            <Flag size={16} /> 举报评论
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/60 font-mono">
            请选择举报原因，每条评论每人只能举报一次
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            {REPORT_REASONS.map(r => (
              <label
                key={r}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                  selected === r
                    ? "border-destructive/50 bg-destructive/8 text-foreground"
                    : "border-white/[0.06] hover:border-white/[0.12] text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  selected === r ? "border-destructive bg-destructive/20" : "border-white/20"
                )}>
                  {selected === r && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                </div>
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={selected === r}
                  onChange={() => setSelected(r)}
                  className="sr-only"
                />
                {r}
              </label>
            ))}
          </div>

          {selected === "其他原因" && (
            <Textarea
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="请描述具体原因……"
              rows={2}
              maxLength={200}
              className="bg-background border-white/[0.08] text-sm resize-none font-mono"
            />
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-white/[0.08] text-sm text-muted-foreground hover:bg-white/[0.04] transition-colors font-mono"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !reason || (selected === "其他原因" && !custom.trim())}
              className="flex-1 h-9 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-mono font-bold hover:bg-destructive/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
              提交举报
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Report Button ────────────────────────────────────────────────────── */
function ReportButton({
  commentId,
  user,
  reported,
  onReport,
}: {
  commentId: number;
  user: any;
  reported: boolean;
  onReport: (id: number) => void;
}) {
  if (!user) return null;

  return reported ? (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/30 font-mono">
      <CheckCircle2 size={10} /> 已举报
    </span>
  ) : (
    <button
      onClick={() => onReport(commentId)}
      title="举报该评论"
      className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-destructive/60 transition-colors font-mono"
    >
      <Flag size={10} /> 举报
    </button>
  );
}


/* ── Comment Thread ───────────────────────────────────────────────────── */
function CommentThread({
  comment,
  replies,
  user,
  onReply,
  replyingTo,
  replyText,
  setReplyText,
  submittingReply,
  onSetReplyingTo,
  reportedIds,
  onOpenReport,
}: {
  comment: Comment;
  replies: Comment[];
  user: any;
  onReply: (parentId: number) => void;
  replyingTo: number | null;
  replyText: string;
  setReplyText: (t: string) => void;
  submittingReply: boolean;
  onSetReplyingTo: (id: number | null) => void;
  reportedIds: Set<number>;
  onOpenReport: (id: number) => void;
}) {
  const isReplying = replyingTo === comment.id;

  return (
    <div className="glass-card rounded-xl px-4 py-3 space-y-3">
      {/* Parent comment */}
      <div className="flex gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[12px] font-bold text-primary">
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-foreground/90">{comment.authorName}</span>
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground/85 leading-relaxed">{comment.content}</p>

          {/* Action bar */}
          <div className="flex items-center gap-3 mt-2">
            {user && (
              <button
                onClick={() => { onSetReplyingTo(isReplying ? null : comment.id); setReplyText(""); }}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  isReplying ? "text-primary" : "text-muted-foreground/50 hover:text-primary"
                )}
              >
                <Reply size={12} />
                {isReplying ? "取消回复" : `回复${replies.length > 0 ? ` (${replies.length})` : ""}`}
              </button>
            )}
            <ReportButton
              commentId={comment.id}
              user={user}
              reported={reportedIds.has(comment.id)}
              onReport={onOpenReport}
            />
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="pl-4 border-l-2 border-primary/15 space-y-3 ml-3">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2">
              <CornerDownRight size={13} className="text-primary/25 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="w-5 h-5 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-[9px] font-bold text-secondary shrink-0">
                    {reply.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-foreground/80">{reply.authorName}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: zhCN })}
                  </span>
                  <div className="ml-auto">
                    <ReportButton
                      commentId={reply.id}
                      user={user}
                      reported={reportedIds.has(reply.id)}
                      onReport={onOpenReport}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed pl-7">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline reply form */}
      {isReplying && (
        <div className="pl-4 border-l-2 border-primary/30 ml-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-primary/70 font-mono">
            <CornerDownRight size={12} />
            回复 {comment.authorName}
          </div>
          <Textarea
            autoFocus
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="写下你的回复……"
            rows={2}
            maxLength={500}
            className="bg-background border-primary/20 text-sm resize-none font-mono bg-primary/[0.03]"
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onReply(comment.id);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/40 font-mono">{replyText.length}/500 · Ctrl+Enter 提交</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { onSetReplyingTo(null); setReplyText(""); }}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={submittingReply || !replyText.trim()}
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {submittingReply ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                提交回复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Detail Page ─────────────────────────────────────────────────── */
export default function WallDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<FailurePost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [notFound, setNotFound] = useState(false);

  /* Report state */
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());

  const id = Number(params.id);

  useEffect(() => {
    if (isNaN(id)) { setNotFound(true); return; }
    fetchPost();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/failures/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (res.ok) setPost(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`${base}/api/failures/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) { toast({ title: "请先登录才能点赞", variant: "destructive" }); return; }
    const res = await fetch(`${base}/api/failures/${id}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setPost(p => p ? { ...p, likeCount: data.likeCount, isLiked: data.isLiked } : p);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "请先登录", variant: "destructive" }); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/api/failures/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "评论失败", variant: "destructive" }); return; }
      setComments(prev => [...prev, data]);
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p);
      setCommentText("");
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = useCallback(async (parentId: number) => {
    if (!user || !replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`${base}/api/failures/comments/${parentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "回复失败", variant: "destructive" }); return; }
      setComments(prev => [...prev, data]);
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p);
      setReplyText("");
      setReplyingTo(null);
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setSubmittingReply(false);
    }
  }, [user, replyText, submittingReply, base, toast]);

  const handleOpenReport = (commentId: number) => {
    setReportTargetId(commentId);
    setReportModalOpen(true);
  };

  const handleReportSuccess = (commentId: number) => {
    setReportedIds(prev => new Set(prev).add(commentId));
  };

  if (notFound) {
    return (
      <Layout>
        <div className="text-center py-32">
          <AlertTriangle className="mx-auto text-destructive mb-4" size={40} />
          <h2 className="text-xl font-bold mb-2">失败故事不存在</h2>
          <p className="text-muted-foreground text-sm mb-6">可能已被删除，或者链接有误</p>
          <Link href="/wall" className="text-primary hover:underline text-sm font-mono">← 返回大屏</Link>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Layout>
    );
  }

  if (!post) return null;

  let embedUrl: string | null = null;
  if (post.videoUrl) {
    if (isYouTubeUrl(post.videoUrl)) embedUrl = getYouTubeEmbedUrl(post.videoUrl);
    else if (isBilibiliUrl(post.videoUrl)) embedUrl = getBilibiliEmbedUrl(post.videoUrl);
  }

  const topLevelComments = comments.filter(c => !c.parentId);
  const totalCount = comments.length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/wall" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono mb-6">
          <ArrowLeft size={13} /> 返回大屏
        </Link>

        {/* Post card */}
        <article className="glass-card rounded-2xl overflow-hidden mb-6">
          {embedUrl ? (
            <div className="aspect-video w-full bg-black">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={post.title} />
            </div>
          ) : post.imageUrl ? (
            <img
              src={post.imageUrl} alt={post.title}
              className="w-full max-h-[480px] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : null}

          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-start gap-2 mb-2">
                <Flame size={16} className="text-orange-400 shrink-0 mt-1" />
                <h1 className="text-2xl font-bold leading-snug">{post.title}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-mono">
                <span className="font-medium text-muted-foreground/80">{post.authorName}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN })}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/90 leading-relaxed whitespace-pre-wrap">{post.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-mono font-medium transition-all",
                    post.isLiked
                      ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                      : "text-muted-foreground hover:text-rose-400 hover:bg-rose-500/5 border border-transparent"
                  )}
                >
                  <Heart size={15} className={post.isLiked ? "fill-current" : ""} />
                  {post.likeCount} 赞
                </button>
                <div className="flex items-center gap-1.5 px-3 py-2 text-sm font-mono text-muted-foreground/50">
                  <MessageCircle size={15} />
                  {post.commentCount} 评论
                </div>
              </div>
              <ShareMenu
                postId={post.id}
                title={post.title}
                description={post.description}
                imageUrl={post.imageUrl}
                variant="bar"
              />
            </div>
          </div>
        </article>

        {/* Comments section */}
        <section>
          <h2 className="text-sm font-bold font-mono text-muted-foreground/70 uppercase tracking-widest mb-4">
            评论区 ({totalCount})
          </h2>

          {user ? (
            <form onSubmit={handleComment} className="glass-card rounded-xl p-4 mb-4 space-y-3">
              <Textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="说点什么… 共情、分享经历、或者只是来围观"
                rows={3}
                maxLength={500}
                className="bg-background border-white/[0.08] text-sm resize-none font-mono"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/40 font-mono">{commentText.length}/500</span>
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  发布评论
                </button>
              </div>
            </form>
          ) : (
            <div className="glass-card rounded-xl p-4 mb-4 text-center text-sm text-muted-foreground/60">
              <Link href="/auth" className="text-primary hover:underline">登录</Link> 后参与评论和回复
            </div>
          )}

          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary/50" size={20} />
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/40 text-sm font-mono">
              还没有评论，来第一个围观吧
            </div>
          ) : (
            <div className="space-y-3">
              {topLevelComments.map(comment => {
                const replies = comments.filter(c => c.parentId === comment.id);
                return (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    replies={replies}
                    user={user}
                    onReply={handleReply}
                    replyingTo={replyingTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    submittingReply={submittingReply}
                    onSetReplyingTo={setReplyingTo}
                    reportedIds={reportedIds}
                    onOpenReport={handleOpenReport}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Report modal */}
      {reportTargetId !== null && (
        <ReportModal
          commentId={reportTargetId}
          open={reportModalOpen}
          onClose={() => { setReportModalOpen(false); setReportTargetId(null); }}
          onSuccess={handleReportSuccess}
        />
      )}
    </Layout>
  );
}
