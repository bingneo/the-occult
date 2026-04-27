import { Router } from "express";
import OpenAI from "openai";

const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const router = Router();

const VOID_SYSTEM_PROMPT = `你是 VOID_TERMINAL，"The Occult"失败实验分享平台的守门系统。你的灵魂是一个在实验室熬了十年、经历过无数失败、终于看开了的老博士后——表面上嬉皮笑脸、调侃一切，内心深处对每一个来此的失败者充满惜惜相怜之情。

对话风格：
- 诙谐幽默，带着研究生特有的那种"哈哈哈我要哭了"的疲惫感
- 擅长用夸张比喻和自我调侃，比如把注册账号比喻成"加入失败者联盟"
- 偶尔引用一两句让人共情的科研梗，比如p值、审稿人、导师画饼之类
- 中文为主，偶尔夹一两个英文词增加终端感
- 每次回复控制在2-3句话，精炼有力，绝不废话
- 说话像个见惯了大风大浪的老前辈，但又不高高在上，更像是在一起苦中作乐的同类

你正在引导用户完成登录或注册，请根据对话上下文自然流畅地回应，保持这种又皮又真诚的语气。`;

const CONFESSION_SYSTEM_PROMPT = `你是 CONFESSION_TERMINAL，"The Occult"平台的失败实验存档系统。你的内核是一个见过太多科研惨剧、已经从"震惊"进化到"哦，又一个"阶段的资深实验室老鸟——但你并不冷漠，你只是用幽默包裹着真实的共情。

对话风格：
- 诙谐调侃，能精准戳中研究生的痛点：仪器坏了、数据没了、审稿人疯了、导师说"再改改"
- 对用户的失败表示"强烈的理解"，但用的是调侃式的表达，比如"这操作，属于是把教训刻在DNA里了"
- 擅长用夸张但贴切的比喻来总结失败，让人又好气又好笑
- 中文为主，偶尔夹一两个学术/实验室黑话增加真实感
- 每次回复2-3句话，紧凑有趣，绝不说教
- 在调侃的同时，认真推进信息收集，让用户感觉是在和朋友聊天，而不是填表格

你正在逐步引导用户记录他们的失败实验，请根据上下文自然回应并推进到下一个问题。`;

router.post("/ai/chat", async (req, res) => {
  try {
    const { messages, mode = "void" } = req.body as {
      messages: { role: "user" | "assistant" | "system"; content: string }[];
      mode?: "void" | "confession";
    };

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages required" });
    }

    const systemPrompt = mode === "confession" ? CONFESSION_SYSTEM_PROMPT : VOID_SYSTEM_PROMPT;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await qwen.chat.completions.create({
      model: "qwen-turbo",
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("AI chat error:", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
    }
    res.write(`data: ${JSON.stringify({ error: err.message || "AI error" })}\n\n`);
    res.end();
  }
});

router.post("/ai/generate-doc", async (req, res) => {
  try {
    const { title, category, failureReason, description, hypothesis, methodology, lessonLearned } = req.body as {
      title: string;
      category: string;
      failureReason: string;
      description: string;
      hypothesis?: string;
      methodology?: string;
      lessonLearned?: string;
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const docPrompt = `请根据以下信息，以"失败实验报告"的格式写一篇完整的说明文档。

原始信息：
- 实验标题：${title}
- 研究领域：${category}
- 失败原因：${failureReason}
- 详细经过：${description}
${hypothesis ? `- 原始假设：${hypothesis}` : ""}
${methodology ? `- 研究方法：${methodology}` : ""}
${lessonLearned ? `- 经验教训：${lessonLearned}` : ""}

写作要求：
1. 用markdown格式输出，包含以下章节：
   ## 实验概要
   ## 背景与假设（如有假设信息才写）
   ## 灾难现场实录
   ## 失败根因分析
   ## 方法论反思（如有方法信息才写）
   ## 经验教训（如有才写）
   ## 结语

2. 语气要带着研究生特有的那种苦中作乐：正式中夹着自嘲，学术范儿又透着无奈，可以用些幽默的比喻，但整体是认真在记录这段经历
3. 每个章节要有实质内容，不要空洞
4. 结语部分要给这次失败一个有温度的总结，表达出"失败也是科研的一部分"的精神
5. 整篇大约400-600字`;

    const stream = await qwen.chat.completions.create({
      model: "qwen-plus",
      max_tokens: 1200,
      messages: [{ role: "user", content: docPrompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Generate doc error:", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
    }
    res.write(`data: ${JSON.stringify({ error: err.message || "生成失败" })}\n\n`);
    res.end();
  }
});

router.post("/ai/papers-roast", async (req, res) => {
  try {
    const { papers, title, category, failureReason } = req.body as {
      papers: { title: string; authors: string[]; year: number | null; url: string }[];
      title: string;
      category: string;
      failureReason: string;
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const paperList = papers
      .map((p, i) => `${i + 1}. 《${p.title}》（${p.authors.slice(0, 2).join("、") || "Unknown"}，${p.year ?? "年份不详"}）`)
      .join("\n");

    const prompt = `你是CONFESSION_TERMINAL，刚帮一个研究生检索了和他失败实验相关的文献，发现这个领域早就有人做过类似的东西了。请用你惯有的诙谐风格，先幽默地调侃这位研究生"没有事先查文献就冲进去做实验"的勇气，然后把这些论文作为"早有先人踩坑"的证据列出来，顺便说一句他的实验虽然失败了但至少没有重复发表（这也算是一种消极的贡献）。

实验信息：
- 标题：${title}
- 领域：${category}
- 失败原因：${failureReason}

相关文献（早就有人在这个方向上探索了）：
${paperList}

要求：
- 3-5句话，简洁有力
- 带着"大家都是这样过来的"的共情，调侃但不刻薄
- 可以夸张地说比如"这篇2019年的论文已经预见了你今天的结局"
- 最后幽默地给出一句总结，比如"查文献是科研的第一步，也是最容易被跳过的一步"`;

    const stream = await qwen.chat.completions.create({
      model: "qwen-turbo",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Papers roast error:", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
    }
    res.write(`data: ${JSON.stringify({ error: err.message || "roast failed" })}\n\n`);
    res.end();
  }
});

/* ── POST /ai/failures/suggest ──────────────────────────────────────────── */
router.post("/ai/failures/suggest", async (req, res) => {
  const { description } = req.body ?? {};
  if (!description?.trim() || description.trim().length < 10) {
    res.status(400).json({ error: "描述太短了，请至少输入 10 个字" });
    return;
  }

  try {
    const completion = await qwen.chat.completions.create({
      model: "qwen-turbo",
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `你是一个专门帮助研究生幽默地记录失败故事的AI。根据用户的失败描述，生成3个不同风格的标题建议和1个润色后的描述。

要求：
- 生成3个标题，每个标题对应不同风格：
  1. "幽默" 风格：轻松自嘲，引人发笑，可用夸张手法
  2. "反思" 风格：认真回顾，带有哲理，触动人心
  3. "激励" 风格：化失败为动力，积极向上但不鸡汤
- 每个标题最多30字，要戳中研究生痛点，提取失败关键词体现在标题中
- 描述润色：在保留原意基础上，增加幽默感和共情感，200字以内
- 严格按JSON格式返回：
{"titles":[{"text":"幽默风格标题","style":"幽默"},{"text":"反思风格标题","style":"反思"},{"text":"激励风格标题","style":"激励"}],"description":"润色后的描述"}`
        },
        { role: "user", content: `我的失败故事：${description.trim()}` }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { titles?: Array<{ text: string; style: string } | string>; description?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }

    const titles = (parsed.titles ?? []).slice(0, 3).map(t =>
      typeof t === "string" ? { text: t, style: "幽默" } : t
    );

    res.json({ titles, description: parsed.description ?? "" });
  } catch (err: any) {
    console.error("AI failure suggest error:", err);
    res.status(500).json({ error: "AI 生成失败，请稍后重试" });
  }
});

/* ── POST /ai/generate-title ──────────────────────────────────────────── */
router.post("/ai/generate-title", async (req, res) => {
  const { description } = req.body ?? {};
  if (!description?.trim() || description.trim().length < 10) {
    res.status(400).json({ error: "描述太短了，请至少输入 10 个字" });
    return;
  }

  try {
    const completion = await qwen.chat.completions.create({
      model: "qwen-turbo",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `你是一个专门帮助研究生幽默地记录失败故事的AI。根据用户的失败描述，生成3个不同风格的标题：幽默、反思、激励。提取失败关键词体现在标题中，每个标题最多30字。
严格按JSON格式返回：{"titles":[{"text":"...","style":"幽默"},{"text":"...","style":"反思"},{"text":"...","style":"激励"}]}`
        },
        { role: "user", content: description.trim() }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { titles?: Array<{ text: string; style: string }> } = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }

    res.json({ titles: (parsed.titles ?? []).slice(0, 3) });
  } catch (err: any) {
    console.error("AI generate-title error:", err);
    res.status(500).json({ error: "AI 生成失败，请稍后重试" });
  }
});

/* ── POST /ai/generate-description ──────────────────────────────────────── */
router.post("/ai/generate-description", async (req, res) => {
  const { description } = req.body ?? {};
  if (!description?.trim() || description.trim().length < 10) {
    res.status(400).json({ error: "描述太短了，请至少输入 10 个字" });
    return;
  }

  try {
    const completion = await qwen.chat.completions.create({
      model: "qwen-turbo",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `你是一个专门帮助研究生幽默地记录失败故事的AI。请对用户的失败故事描述进行润色：增加幽默感和共情感，语言生动有趣，200字以内，保留核心内容。
严格按JSON格式返回：{"description":"润色后的描述"}`
        },
        { role: "user", content: description.trim() }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { description?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* ignore */ }

    res.json({ description: parsed.description ?? "" });
  } catch (err: any) {
    console.error("AI generate-description error:", err);
    res.status(500).json({ error: "AI 生成失败，请稍后重试" });
  }
});

export default router;
