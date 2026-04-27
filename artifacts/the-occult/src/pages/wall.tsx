import { Layout } from "@/components/layout";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Heart, MessageCircle, Plus, Loader2,
  Image as ImageIcon, Video, X, ChevronLeft, ChevronRight, Flame,
  Send, Upload, Sparkles, Check, Link as LinkIcon,
  Edit3, Trash2, BookOpen, Eye, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ShareMenu, StyleBadge } from "@/components/share-menu";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FailurePost {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  userId: number;
  authorName: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
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

/* ── Card ─────────────────────────────────────────────────────────────── */
function FailureCard({
  post,
  onLike,
  onDelete,
}: {
  post: FailurePost;
  onLike: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "请先登录才能点赞", variant: "destructive" }); return; }
    onLike(post.id);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${base}/api/failures/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "失败故事已删除" });
        onDelete?.(post.id);
      } else {
        const data = await res.json();
        toast({ title: data.error ?? "删除失败", variant: "destructive" });
      }
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  let embedUrl: string | null = null;
  if (post.videoUrl) {
    if (isYouTubeUrl(post.videoUrl)) embedUrl = getYouTubeEmbedUrl(post.videoUrl);
    else if (isBilibiliUrl(post.videoUrl)) embedUrl = getBilibiliEmbedUrl(post.videoUrl);
  }

  const isOwn = user?.id === post.userId;

  return (
    <div className="group glass-card rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(13,240,218,0.08)] flex flex-col">
      {/* Media */}
      {(post.imageUrl || embedUrl) && (
        <div className="relative w-full bg-black/20">
          {embedUrl ? (
            <div className="aspect-video w-full">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={post.title} />
            </div>
          ) : post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full max-h-64 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : null}
        </div>
      )}

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <Link href={`/wall/${post.id}`}>
            <h3 className="font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer mb-2">
              {post.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed">
            {post.description}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all",
              post.isLiked
                ? "text-rose-400 bg-rose-500/10"
                : "text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10"
            )}
          >
            <Heart size={13} className={post.isLiked ? "fill-current" : ""} />
            {post.likeCount}
          </button>
          <Link href={`/wall/${post.id}`}>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-muted-foreground/60 hover:text-primary/80 hover:bg-primary/5 transition-all">
              <MessageCircle size={13} />
              {post.commentCount}
            </button>
          </Link>
          <ShareMenu
            postId={post.id}
            title={post.title}
            description={post.description}
            imageUrl={post.imageUrl}
            variant="icon"
          />
          <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN })}
          </span>
        </div>

        {/* Action footer */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05] mt-auto">
          <Link href={`/wall/${post.id}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-mono text-muted-foreground/70 hover:text-primary hover:border-primary/30 transition-all">
              <Eye size={12} /> 查看详情
            </button>
          </Link>
          {isOwn && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-destructive font-mono">确认删除？</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive/70 transition-colors p-1"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-mono text-muted-foreground/50 hover:text-destructive hover:border-destructive/30 transition-all"
              >
                <Trash2 size={12} /> 删除
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── useFileUpload ────────────────────────────────────────────────────── */
function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true);
    setProgress(10);
    try {
      const urlRes = await fetch(`${base}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) { toast({ title: urlData.error ?? "上传失败", variant: "destructive" }); return null; }

      setProgress(40);
      const putRes = await fetch(urlData.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) { toast({ title: "上传到云存储失败", variant: "destructive" }); return null; }

      setProgress(100);
      const servingUrl = `${base}/api/storage${urlData.objectPath}`;
      return servingUrl;
    } catch {
      toast({ title: "网络错误，上传失败", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  }, [toast]);

  return { uploadFile, uploading, progress };
}

/* ── AI Suggest Panel ─────────────────────────────────────────────────── */
interface AiTitle { text: string; style: string }
interface AiSuggestion { titles: AiTitle[]; description: string }

function AiSuggestPanel({
  description,
  onApplyTitle,
  onApplyDescription,
}: {
  description: string;
  onApplyTitle: (t: string) => void;
  onApplyDescription: (d: string) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState("");

  const canSuggest = description.trim().length >= 20;

  const suggest = async () => {
    if (!canSuggest) return;
    setLoading(true);
    setOpen(true);
    setEditingDesc(false);
    try {
      const res = await fetch(`${base}/api/ai/failures/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "AI 生成失败", variant: "destructive" }); setOpen(false); return; }
      const normalised: AiSuggestion = {
        titles: (data.titles ?? []).map((t: AiTitle | string) =>
          typeof t === "string" ? { text: t, style: "幽默" } : t
        ),
        description: data.description ?? "",
      };
      setResult(normalised);
      setEditedDesc(normalised.description);
    } catch {
      toast({ title: "AI 服务暂时不可用", variant: "destructive" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const applyDesc = (text: string) => {
    onApplyDescription(text);
    toast({ title: "描述已采用" });
    setEditingDesc(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={suggest}
          disabled={!canSuggest || loading}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
            canSuggest
              ? "border-violet-500/30 bg-violet-500/[0.08] text-violet-400 hover:bg-violet-500/15"
              : "border-white/10 text-muted-foreground/30 cursor-not-allowed"
          )}
          title={!canSuggest ? "请先输入至少 20 字的失败描述" : ""}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? "AI 生成中…" : result ? "重新生成" : "AI 一键生成标题建议"}
          {!canSuggest && <span className="text-[10px] opacity-50 ml-1">（至少 20 字）</span>}
        </button>
        {result && !loading && (
          <span className="text-[10px] text-muted-foreground/40 font-mono">支持编辑后再采用</span>
        )}
      </div>

      {open && (loading || result) && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3 space-y-4">
          <div className="flex items-center gap-2 text-[10px] text-violet-400/70 font-mono uppercase tracking-wider">
            <Sparkles size={10} /> AI 生成建议
            <button type="button" onClick={() => setOpen(false)} className="ml-auto text-muted-foreground/40 hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 size={14} className="animate-spin text-violet-400" />
              <span className="text-xs text-muted-foreground/60">正在分析失败故事，提炼关键词…</span>
            </div>
          ) : result && (
            <>
              {/* Title suggestions */}
              {result.titles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">
                    标题建议（3 种风格，点击采用）
                  </div>
                  {result.titles.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { onApplyTitle(t.text); toast({ title: `「${t.style}」风格标题已采用` }); }}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-foreground/90 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all flex items-center gap-2 group"
                    >
                      <StyleBadge style={t.style} />
                      <span className="flex-1 leading-snug">{t.text}</span>
                      <Check size={10} className="text-violet-400/50 group-hover:text-violet-400 shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Description suggestion */}
              {result.description && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">描述润色建议</div>
                    <button
                      type="button"
                      onClick={() => { setEditingDesc(v => !v); setEditedDesc(result.description); }}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-violet-400 font-mono transition-colors"
                    >
                      <Edit3 size={9} /> {editingDesc ? "查看原文" : "编辑"}
                    </button>
                  </div>

                  {editingDesc ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedDesc}
                        onChange={e => setEditedDesc(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        className="bg-background border-violet-500/20 font-mono text-xs resize-none focus:border-violet-500/40"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyDesc(editedDesc)}
                          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 hover:bg-violet-500/25 font-mono transition-all"
                        >
                          <Check size={10} /> 采用编辑后的描述
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDesc(result.description)}
                          className="text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.08] text-muted-foreground/60 hover:text-foreground font-mono transition-all"
                        >
                          采用原始建议
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground/80 bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] leading-relaxed whitespace-pre-wrap">
                        {result.description}
                      </div>
                      <button
                        type="button"
                        onClick={() => applyDesc(result.description)}
                        className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 font-mono transition-colors"
                      >
                        <Check size={10} /> 直接采用此描述
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Submit Modal ─────────────────────────────────────────────────────── */
function SubmitModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (post: FailurePost) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageServingUrl, setImageServingUrl] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<"url" | "file">("url");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoServingUrl, setVideoServingUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile: uploadImage, uploading: uploadingImage, progress: imageProgress } = useFileUpload();
  const { uploadFile: uploadVideo, uploading: uploadingVideo, progress: videoProgress } = useFileUpload();

  const resetForm = () => {
    setTitle(""); setDescription("");
    setImagePreview(null); setImageServingUrl(null);
    setVideoMode("url"); setVideoUrl(""); setVideoFile(null); setVideoServingUrl(null);
    setSubmitDone(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setImageServingUrl(null);
    const url = await uploadImage(file);
    if (url) setImageServingUrl(url);
    else { setImagePreview(null); }
    e.target.value = "";
  };

  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoServingUrl(null);
    const url = await uploadVideo(file);
    if (url) setVideoServingUrl(url);
    else { setVideoFile(null); }
    e.target.value = "";
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageServingUrl(null);
  };

  const finalVideoUrl = videoMode === "url" ? (videoUrl.trim() || undefined) : (videoServingUrl ?? undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "请先登录", variant: "destructive" }); return; }
    if (!title.trim() || !description.trim()) return;
    if (uploadingImage || uploadingVideo) { toast({ title: "请等待文件上传完成", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/api/failures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          imageUrl: imageServingUrl ?? undefined,
          videoUrl: finalVideoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "发布失败", variant: "destructive" }); return; }
      setSubmitDone(true);
      toast({ title: "🎉 失败故事发布成功！同是天涯沦落人" });
      onSuccess(data);
      setTimeout(() => { resetForm(); onClose(); }, 1200);
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-xl bg-card border-white/[0.08] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary tracking-wider flex items-center gap-2">
            <Flame size={18} /> 投稿你的失败故事
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-1">
          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-1.5 block uppercase tracking-wider">
              失败标题 <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="用一句话概括你的惨痛经历"
              maxLength={200}
              required
              className="bg-background border-white/[0.08] font-mono text-sm"
            />
            <div className="text-right text-[10px] text-muted-foreground/40 mt-1">{title.length}/200</div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-1.5 block uppercase tracking-wider">
              失败详情 <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="详细描述你的失败经历，越惨越好，越好笑越好…（至少 20 字可解锁 AI 建议）"
              rows={4}
              maxLength={2000}
              required
              className="bg-background border-white/[0.08] font-mono text-sm resize-none"
            />
            <div className="text-right text-[10px] text-muted-foreground/40 mt-1">{description.length}/2000</div>
          </div>

          {/* AI suggestions */}
          <AiSuggestPanel
            description={description}
            onApplyTitle={setTitle}
            onApplyDescription={setDescription}
          />

          {/* Image upload */}
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-2 flex items-center gap-1 uppercase tracking-wider">
              <ImageIcon size={11} /> 图片（可选，最大 10MB）
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleImageSelect}
            />
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/[0.08] group">
                <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${imageProgress}%` }} />
                    </div>
                    <span className="text-xs text-primary font-mono">上传中 {imageProgress}%</span>
                  </div>
                )}
                {!uploadingImage && imageServingUrl && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/80 text-white text-[10px] font-mono px-2 py-1 rounded-full">
                    <Check size={9} /> 上传成功
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 left-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <X size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 flex items-center gap-1"
                >
                  <RefreshCw size={9} /> 更换
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground/50 hover:text-primary/70 group"
              >
                <Upload size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono">点击上传图片</span>
                <span className="text-[10px] opacity-60">支持 JPEG · PNG · WebP · GIF</span>
              </button>
            )}
          </div>

          {/* Video */}
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-2 flex items-center gap-1 uppercase tracking-wider">
              <Video size={11} /> 视频（可选）
            </label>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setVideoMode("url")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
                  videoMode === "url"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                <LinkIcon size={10} /> 粘贴链接
              </button>
              <button
                type="button"
                onClick={() => setVideoMode("file")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
                  videoMode === "file"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                <Upload size={10} /> 上传文件
              </button>
            </div>

            {videoMode === "url" ? (
              <Input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="B站 / YouTube 链接"
                type="url"
                className="bg-background border-white/[0.08] font-mono text-xs"
              />
            ) : (
              <>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="sr-only"
                  onChange={handleVideoFileSelect}
                />
                {videoFile ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <Video size={14} className="text-primary/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground/80 font-mono truncate">{videoFile.name}</div>
                      <div className="text-[10px] text-muted-foreground/50">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                      {uploadingVideo && (
                        <div className="mt-1.5 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${videoProgress}%` }} />
                        </div>
                      )}
                    </div>
                    {uploadingVideo ? (
                      <div className="flex items-center gap-1 text-[10px] text-primary font-mono shrink-0">
                        <Loader2 size={11} className="animate-spin" /> {videoProgress}%
                      </div>
                    ) : videoServingUrl ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono shrink-0"><Check size={10} /> 完成</span>
                    ) : null}
                    <button type="button" onClick={() => { setVideoFile(null); setVideoServingUrl(null); }} className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full h-16 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-primary/30 transition-all flex items-center justify-center gap-2 text-muted-foreground/50 hover:text-primary/70 text-xs font-mono"
                  >
                    <Upload size={14} /> 选择视频文件（MP4 / WebM，最大 100MB）
                  </button>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 h-10 rounded-xl border border-white/[0.08] text-muted-foreground text-sm font-mono hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim() || uploadingImage || uploadingVideo}
              className={cn(
                "flex-1 h-10 rounded-xl text-sm font-mono font-bold transition-all flex items-center justify-center gap-2",
                submitDone
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-50"
              )}
            >
              {submitDone ? (
                <><Check size={14} /> 发布成功！</>
              ) : submitting ? (
                <><Loader2 size={14} className="animate-spin" /> 发布中...</>
              ) : (uploadingImage || uploadingVideo) ? (
                <><Loader2 size={14} className="animate-spin" /> 上传中...</>
              ) : (
                <><Send size={14} /> 公开我的失败</>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Wall Page — Personal Failure Library ────────────────────────── */
export default function Wall() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FailurePost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submitOpen, setSubmitOpen] = useState(false);

  const LIMIT = 12;

  const fetchPosts = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${base}/api/failures?page=${p}&limit=${LIMIT}&mine=true`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setPosts(data.failures ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPosts(page);
    else setLoading(false);
  }, [page, user]);

  const handleLike = async (id: number) => {
    try {
      const res = await fetch(`${base}/api/failures/${id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === id ? { ...p, likeCount: data.likeCount, isLiked: data.isLiked } : p));
      } else if (res.status === 401) {
        toast({ title: "请先登录才能点赞", variant: "destructive" });
      }
    } catch { /* ignore */ }
  };

  const handleDelete = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setTotal(t => t - 1);
    if (posts.length === 1 && page > 1) {
      setPage(p => p - 1);
    } else {
      fetchPosts(page);
    }
  };

  const handleNewPost = (post: FailurePost) => {
    setPosts(prev => [post, ...prev]);
    setTotal(t => t + 1);
  };

  /* Not logged in */
  if (!user && !loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
          <div className="text-6xl">🔐</div>
          <div>
            <h2 className="text-xl font-bold mb-2">登录后查看你的失败作品库</h2>
            <p className="text-sm text-muted-foreground">记录和管理你发布的所有失败故事</p>
          </div>
          <button
            onClick={() => setLocation("/auth")}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 border border-primary/30 text-primary font-mono font-bold rounded-xl hover:bg-primary/20 transition-all"
          >
            前往登录
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-mono text-muted-foreground/40 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-full mb-3">
            <BookOpen size={10} className="text-primary" />
            MY_FAILURE_ARCHIVE :: 失败作品库
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">
            我的失败作品库
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 <span className="text-primary font-mono font-bold">{total}</span> 条失败故事 · 每一条都是真实的科研历程
          </p>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-32">
          <div className="text-6xl mb-4">🧪</div>
          <h3 className="text-xl font-bold text-muted-foreground mb-2">还没有失败故事</h3>
          <p className="text-sm text-muted-foreground/50 mb-6">
            勇敢踏出第一步，发布你的第一个失败实验
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/30 text-primary text-sm font-mono font-bold rounded-xl hover:bg-primary/20 transition-all mx-auto"
          >
            <Plus size={14} /> 投稿我的失败
          </Link>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {posts.map(post => (
            <div key={post.id} className="break-inside-avoid mb-4">
              <FailureCard
                post={post}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-30"
          >
            <ChevronLeft size={15} /> 上一页
          </button>
          <span className="text-xs text-muted-foreground/50 font-mono">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-30"
          >
            下一页 <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── Submit Modal ─────────────────────────────────────────────────── */}
      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSuccess={handleNewPost}
      />
    </Layout>
  );
}
