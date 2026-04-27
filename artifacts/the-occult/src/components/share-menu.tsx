import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, ExternalLink, Smartphone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const STYLE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  幽默: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  反思: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  激励: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
};

export function StyleBadge({ style }: { style: string }) {
  const cfg = STYLE_CONFIG[style] ?? { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" };
  return (
    <span className={cn("text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0", cfg.color, cfg.bg, cfg.border)}>
      {style}
    </span>
  );
}

interface ShareMenuProps {
  postId?: number;
  url?: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  variant?: "icon" | "bar";
  className?: string;
}

export function ShareMenu({ postId, url: urlProp, title, description, imageUrl, variant = "icon", className }: ShareMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const url = urlProp ?? `${window.location.origin}${base}/wall/${postId}`;
  const shareText = `【失败故事】${title} via THE_OCCULT`;
  const weiboHref =
    `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}` +
    (imageUrl ? `&pic=${encodeURIComponent(imageUrl)}` : "");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const copyLink = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "🔗 链接已复制到剪贴板！" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "复制失败，请手动复制链接", variant: "destructive" });
    }
    setOpen(false);
  };

  const wechatShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyLink();
    toast({ title: "📋 链接已复制，请在微信中粘贴发送给好友" });
  };

  const systemShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.share?.({ title, text: description.slice(0, 100), url });
    setOpen(false);
  };

  const hasSystemShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (variant === "bar") {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        <span className="text-[11px] text-muted-foreground/50 font-mono uppercase tracking-wider">分享：</span>

        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30 font-mono transition-all"
        >
          {copied ? <Check size={9} className="text-green-400" /> : <Copy size={9} />}
          复制链接
        </button>

        <a
          href={weiboHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] text-muted-foreground hover:text-orange-400 hover:border-orange-400/30 font-mono transition-all"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={9} /> 微博
        </a>

        <button
          onClick={wechatShare}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] text-muted-foreground hover:text-green-400 hover:border-green-400/30 font-mono transition-all"
          title="复制链接，在微信中粘贴分享"
        >
          <MessageSquare size={9} /> 微信
        </button>

        {hasSystemShare && (
          <button
            onClick={systemShare}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30 font-mono transition-all"
          >
            <Share2 size={9} /> 更多
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all",
          open
            ? "text-primary bg-primary/10"
            : "text-muted-foreground/60 hover:text-primary/80 hover:bg-primary/5"
        )}
        title="分享"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Share2 size={13} />}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1 z-50 min-w-[160px] rounded-xl border border-white/[0.08] bg-card shadow-xl shadow-black/40 py-1.5 overflow-hidden">
          <div className="px-3 py-1.5 text-[9px] text-muted-foreground/40 font-mono uppercase tracking-widest border-b border-white/[0.05] mb-1">
            分享故事
          </div>

          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors font-mono text-left"
          >
            {copied ? <Check size={12} className="text-green-400 shrink-0" /> : <Copy size={12} className="shrink-0" />}
            复制链接
          </button>

          <a
            href={weiboHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { e.stopPropagation(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-orange-400 hover:bg-orange-500/[0.06] transition-colors font-mono"
          >
            <ExternalLink size={12} className="shrink-0" />
            分享到微博
          </a>

          <button
            onClick={wechatShare}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-green-400 hover:bg-green-500/[0.06] transition-colors font-mono text-left"
          >
            <MessageSquare size={12} className="shrink-0" />
            <span>微信分享</span>
            <span className="ml-auto text-[9px] opacity-50">（复制链接）</span>
          </button>

          {hasSystemShare && (
            <button
              onClick={systemShare}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors font-mono text-left"
            >
              <Smartphone size={12} className="shrink-0" />
              系统分享
            </button>
          )}
        </div>
      )}
    </div>
  );
}
