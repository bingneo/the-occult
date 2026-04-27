import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.NOTIFICATION_FROM_EMAIL ?? "The Occult <noreply@theoccult.app>";

export interface CommentEmailParams {
  toEmail: string;
  toName: string;
  commenterName: string;
  experimentTitle: string;
  experimentId: number;
  commentPreview: string;
}

export interface PasswordResetEmailParams {
  toEmail: string;
  toName: string;
  resetToken: string;
}

export function isEmailEnabled(): boolean {
  return !!RESEND_API_KEY;
}

export async function sendCommentNotificationEmail(
  params: CommentEmailParams
): Promise<void> {
  if (!RESEND_API_KEY) return;

  const { toEmail, toName, commenterName, experimentTitle, experimentId, commentPreview } =
    params;

  const appUrl = process.env.APP_URL ?? "https://theoccult.replit.app";
  const experimentUrl = `${appUrl}/experiments/${experimentId}`;

  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: "有人围观了你的失败实验",
    html: `
<div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <p style="font-size:16px;font-weight:bold;margin-bottom:8px">// THE_OCCULT 系统通知</p>
  <p style="color:#555;margin-bottom:20px">你好，${toName}。</p>
  <p style="margin-bottom:16px">
    <strong>${commenterName}</strong> 围观了你的失败实验《<strong>${experimentTitle}</strong>》并留下了评论：
  </p>
  <blockquote style="border-left:3px solid #888;padding:8px 16px;color:#444;margin:0 0 20px;background:#f5f5f5">
    "${commentPreview}"
  </blockquote>
  <a href="${experimentUrl}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;font-weight:bold;margin-bottom:24px">
    进入实验页查看完整评论 →
  </a>
  <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:16px;margin-top:8px">
    你收到此邮件是因为你在 The Occult 注册时提供了邮箱。<br/>
    失败是成功TA妈，感谢你愿意公开失败 :)
  </p>
</div>`,
  });
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[DEV] Password reset token for ${params.toEmail}: ${params.resetToken}`);
    return;
  }

  const { toEmail, toName, resetToken } = params;
  const appUrl = process.env.APP_URL ?? "https://theoccult.replit.app";
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: "// THE_OCCULT — 密码重置请求",
    html: `
<div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;background:#fff">
  <p style="font-size:16px;font-weight:bold;margin-bottom:4px;color:#0a0a0a">// THE_OCCULT</p>
  <p style="font-size:11px;color:#999;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:16px">密码重置系统通知</p>

  <p style="margin-bottom:8px;color:#555">你好，${toName}。</p>
  <p style="margin-bottom:20px;color:#333">
    我们收到了你的密码重置请求。点击下方按钮以重置你的密码。<br/>
    此链接将在 <strong>1 小时后失效</strong>。
  </p>

  <a href="${resetUrl}"
    style="display:inline-block;padding:12px 28px;background:#0d0d0d;color:#0df0da;text-decoration:none;font-weight:bold;font-size:14px;border:1px solid #0df0da;letter-spacing:0.05em;margin-bottom:24px">
    → 重置我的密码
  </a>

  <p style="color:#aaa;font-size:12px;margin-bottom:8px">
    如果按钮无法点击，请复制以下链接到浏览器：
  </p>
  <p style="color:#888;font-size:11px;word-break:break-all;margin-bottom:24px;padding:8px;background:#f5f5f5;border-left:3px solid #ddd">
    ${resetUrl}
  </p>

  <p style="color:#bbb;font-size:11px;border-top:1px solid #eee;padding-top:16px">
    如果这不是你本人的操作，请忽略此邮件，你的密码不会有任何变更。<br/>
    失败是成功TA妈，希望这次重置也不算太失败 :)
  </p>
</div>`,
  });
}
