import { Layout } from "@/components/layout";
import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "请求失败，请稍后重试");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("网络错误，请稍后重试");
      setStatus("error");
    }
  };

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Mail className="text-primary" size={24} />
            </div>
            <h1 className="text-2xl font-bold gradient-text mb-2 uppercase tracking-widest">
              重置密码
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              输入注册时的邮箱，我们将发送重置链接
            </p>
          </div>

          <div className="glass-card p-8">
            {status === "success" ? (
              /* Success state */
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto text-primary" size={40} />
                <div>
                  <h2 className="font-bold text-lg mb-2 text-primary">重置链接已发送</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    如果该邮箱已注册，你将收到一封来自 The Occult 的重置邮件。<br />
                    链接在 <span className="text-primary font-bold">1 小时</span>内有效。
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/50 font-mono">
                  没收到？请检查垃圾邮件文件夹
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-2"
                >
                  <ArrowLeft size={14} /> 返回登录
                </Link>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block font-mono uppercase tracking-wider">
                    注册邮箱
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={15} />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-9 bg-card border-white/[0.08] h-11 text-sm font-mono"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 text-destructive text-xs font-mono bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg">
                    <AlertTriangle size={13} className="shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading" || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 h-11 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-xl font-mono font-bold text-sm transition-all disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <><Loader2 size={15} className="animate-spin" /> 发送中...</>
                  ) : (
                    <><Mail size={15} /> 发送重置链接</>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft size={12} /> 返回登录
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* Decorative terminal footer */}
          <div className="mt-4 text-center text-[10px] text-muted-foreground/30 font-mono">
            // OCCULT_SYS :: PASSWORD_RECOVERY_MODULE :: v0.9
          </div>
        </div>
      </div>
    </Layout>
  );
}
