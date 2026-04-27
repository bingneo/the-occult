import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ThumbsUp, MessageSquare, AlertTriangle, Bookmark, Tag } from "lucide-react";
import type { Experiment } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLikeExperiment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListExperimentsQueryKey, getGetExperimentQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-context";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ExperimentCard({ experiment }: { experiment: Experiment & { isCollected?: boolean } }) {
  const likeExperiment = useLikeExperiment();
  const queryClient = useQueryClient();
  const [isLiking, setIsLiking] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isCollected, setIsCollected] = useState(experiment.isCollected ?? false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);
    try {
      await likeExperiment.mutateAsync({ id: experiment.id, data: undefined });
      queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(experiment.id) });
    } finally {
      setIsLiking(false);
    }
  };

  const handleCollect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isCollecting) return;
    setIsCollecting(true);
    const next = !isCollected;
    setIsCollected(next);
    try {
      const method = next ? "POST" : "DELETE";
      const res = await fetch(`${base}/api/experiments/${experiment.id}/collect`, {
        method,
        credentials: "include",
      });
      if (!res.ok) setIsCollected(!next);
    } catch {
      setIsCollected(!next);
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/experiments/${experiment.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/experiments/${experiment.id}`)}
      className="group relative flex flex-col h-full glass-card p-5 hover:border-primary/25 hover:shadow-[0_0_32px_rgba(13,240,218,0.10)] transition-all duration-300 cursor-pointer overflow-hidden"
    >

      <div className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-center justify-between mb-3.5">
        <span className="occult-id">
          OCCULT-{experiment.id.toString().padStart(4, "0")}
        </span>
        <span className="occult-badge bg-secondary/10 text-secondary">
          {experiment.category}
        </span>
      </div>

      <h3 className="text-base font-bold leading-snug mb-2 group-hover:text-primary transition-colors duration-200 line-clamp-2">
        {experiment.title}
      </h3>

      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-grow mb-4">
        {experiment.description}
      </p>

      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full max-w-full">
          <AlertTriangle size={11} className="shrink-0" />
          <span className="truncate">{experiment.failureReason}</span>
        </span>
      </div>

      {experiment.tags && experiment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {experiment.tags.slice(0, 3).map((tag: { id: number; name: string }) => (
            <button
              key={tag.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/explore?tag=${encodeURIComponent(tag.name)}`); }}
              className="flex items-center gap-1 text-[10px] text-primary/70 bg-primary/5 border border-primary/15 px-2 py-0.5 rounded-full hover:bg-primary/10 hover:text-primary transition-colors font-mono"
            >
              <Tag size={9} />#{tag.name}
            </button>
          ))}
          {experiment.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground/50 self-center">+{experiment.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="occult-divider pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {experiment.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground flex items-center min-w-0">
            <Link
              href={`/users/${experiment.authorId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary transition-colors truncate"
            >
              {experiment.authorName}
            </Link>
            <span className="mx-1 opacity-40 shrink-0">·</span>
            <span className="shrink-0">
              {formatDistanceToNow(new Date(experiment.createdAt), { addSuffix: true, locale: zhCN })}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground shrink-0 ml-2">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={cn(
              "flex items-center gap-1 text-xs hover:text-primary transition-colors",
              experiment.isLiked && "text-primary"
            )}
          >
            <ThumbsUp size={12} className={cn(experiment.isLiked && "fill-primary")} />
            <span className="font-mono">{experiment.likeCount}</span>
          </button>
          <div className="flex items-center gap-1 text-xs">
            <MessageSquare size={12} />
            <span className="font-mono">{experiment.commentCount}</span>
          </div>
          {user && (
            <button
              onClick={handleCollect}
              disabled={isCollecting}
              title={isCollected ? "取消收藏" : "收藏"}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                isCollected ? "text-amber-400" : "hover:text-amber-400"
              )}
            >
              <Bookmark
                size={12}
                className={cn(isCollected && "fill-amber-400 stroke-amber-400")}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
