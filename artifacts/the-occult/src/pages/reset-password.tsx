import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { Link } from "wouter";
import { KeyRound, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ResetPassword() {
  const searchStr = useSearch();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(searchStr).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/forgot-password");
    }
  }, [token]);

  const passwordStrength = (pwd: string): { label: string; color: string; pct: number } => {
    if (pwd.length === 0) return { label: "", color: "bg-muted", pct: 0 };
    if (pwd.length < 6) return { label: "太短", color: "bg-destructive", pct: 20 };
    if (pwd.length < 8) return { label: "弱", color: "bg-orange-500", pct: 45 };
    if (pwd.length < 12) return { label: "中等", color: "bg-yellow-500", pct: 70 };
    return { label: "强", color: "bg-primary", pct: 100 };
  };

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    if (password.length < 6) { setErrorMsg("密码至少需要 6 个字符"); setStatus("error"); return; }
    if (password !== confirm) { setErrorMsg("两次输入的密码不一致"); setStatus("error"); return; }

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "重置失败，链接可能已过期");
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
              <KeyRound className="text-primary" size={24} />
            </div>
            <h1 className="text-2xl font-bold gradient-text mb-2 uppercase tracking-widest">
              设置新密码
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              为你的账户设置一个新密码
            </p>
          </div>

          <div className="glass-card p-8">
            {status === "success" ? (
              /* Success */
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto text-primary" size={40} />
                <div>
                  <h2 className="font-bold text-lg mb-2 text-primary">密码重置成功</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    你的密码已成功更新。<br />
                    现在可以使用新密码登录了。
                  </p>
                </div>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-xl font-mono font-bold text-sm transition-all mt-2"
                >
                  前往登录 →
                </Link>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block font-mono uppercase tracking-wider">
                    新密码
                  </label>
                  <div className="relative">
                    <Input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
                      placeholder="至少 6 个字符"
                      className="pr-10 bg-card border-white/[0.08] h-11 text-sm font-mono"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 font-mono">密码强度：{strength.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block font-mono uppercase tracking-wider">
                    确认新密码
                  </label>
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
                    placeholder="再次输入新密码"
                    className="bg-card border-white/[0.08] h-11 text-sm font-mono"
                    required
                  />
                  {confirm.length > 0 && password !== confirm && (
                    <p className="text-[10px] text-destructive font-mono mt-1">密码不一致</p>
                  )}
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 text-destructive text-xs font-mono bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg">
                    <AlertTriangle size={13} className="shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading" || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 h-11 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-xl font-mono font-bold text-sm transition-all disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <><Loader2 size={15} className="animate-spin" /> 重置中...</>
                  ) : (
                    <><KeyRound size={15} /> 确认重置密码</>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft size={12} /> 重新发送邮件
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="mt-4 text-center text-[10px] text-muted-foreground/30 font-mono">
            // OCCULT_SYS :: PASSWORD_RESET_MODULE :: v0.9
          </div>
        </div>
      </div>
    </Layout>
  );
}
