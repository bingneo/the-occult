import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetNotifications,
  useMarkNotificationsRead,
  getGetNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-context";
import { Layout } from "@/components/layout";
import { Bell, BellOff, FlaskConical, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetNotifications({
    query: { enabled: !!user && !authLoading },
  });
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (data && data.unreadCount > 0) {
      markRead.mutate(undefined, {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
      });
    }
  }, [data?.unreadCount]);

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-3 pt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 glass-card animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <Lock size={40} className="mx-auto opacity-30" />
          <p className="text-sm text-muted-foreground">请先登录才能查看消息通知</p>
          <Link
            href="/auth"
            className="inline-block px-6 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
          >
            去登录
          </Link>
        </div>
      </Layout>
    );
  }

  const notifications = data?.notifications ?? [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 occult-divider">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="text-primary" size={20} /> 消息通知
          </h1>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">{notifications.length} 条记录</span>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 glass-card animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && notifications.length === 0 && (
          <div className="py-20 text-center text-muted-foreground space-y-3">
            <BellOff size={40} className="mx-auto opacity-20" />
            <p className="text-sm">暂时没人围观你的失败</p>
            <p className="text-xs opacity-60">可能大家都还在失败的路上……</p>
          </div>
        )}

        {/* Notification list */}
        {!isLoading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "glass-card p-4 flex items-start gap-3 transition-all duration-200",
                  n.isRead
                    ? "opacity-55"
                    : "border border-primary/30 bg-primary/5 glow-primary"
                )}
              >
                <FlaskConical
                  size={16}
                  className={cn(
                    "mt-0.5 shrink-0",
                    n.isRead ? "text-muted-foreground" : "text-primary"
                  )}
                />
                <div className="flex-1 min-w-0">
                  {n.experimentId ? (
                    <Link
                      href={`/experiments/${n.experimentId}`}
                      className="text-sm font-medium hover:text-primary transition-colors block leading-relaxed"
                    >
                      {n.content}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed">{n.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
