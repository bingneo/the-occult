--
-- PostgreSQL database dump
--

\restrict lg8h6A7vuzgu4ceQdescaoAmbZepUQoOECiAWlbRjqd6FRE2fRgxlCeJhqGyk2g

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comment_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comment_reports (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    user_id integer NOT NULL,
    report_reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comment_reports OWNER TO postgres;

--
-- Name: comment_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comment_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comment_reports_id_seq OWNER TO postgres;

--
-- Name: comment_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comment_reports_id_seq OWNED BY public.comment_reports.id;


--
-- Name: comment_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comment_votes (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    user_id integer NOT NULL,
    vote integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comment_votes OWNER TO postgres;

--
-- Name: comment_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comment_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comment_votes_id_seq OWNER TO postgres;

--
-- Name: comment_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comment_votes_id_seq OWNED BY public.comment_votes.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text NOT NULL,
    author_id integer NOT NULL,
    experiment_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id integer
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: experiment_comment_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.experiment_comment_reports (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    user_id integer NOT NULL,
    report_reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.experiment_comment_reports OWNER TO postgres;

--
-- Name: experiment_comment_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.experiment_comment_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experiment_comment_reports_id_seq OWNER TO postgres;

--
-- Name: experiment_comment_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.experiment_comment_reports_id_seq OWNED BY public.experiment_comment_reports.id;


--
-- Name: experiment_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.experiment_tags (
    experiment_id integer NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public.experiment_tags OWNER TO postgres;

--
-- Name: experiments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.experiments (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    failure_reason text NOT NULL,
    hypothesis text,
    methodology text,
    lesson_learned text,
    image_url text,
    author_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_report text,
    image_paths text[],
    video_urls text[]
);


ALTER TABLE public.experiments OWNER TO postgres;

--
-- Name: experiments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.experiments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experiments_id_seq OWNER TO postgres;

--
-- Name: experiments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.experiments_id_seq OWNED BY public.experiments.id;


--
-- Name: failure_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failure_comments (
    id integer NOT NULL,
    failure_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id integer
);


ALTER TABLE public.failure_comments OWNER TO postgres;

--
-- Name: failure_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.failure_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failure_comments_id_seq OWNER TO postgres;

--
-- Name: failure_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.failure_comments_id_seq OWNED BY public.failure_comments.id;


--
-- Name: failure_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failure_likes (
    id integer NOT NULL,
    failure_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.failure_likes OWNER TO postgres;

--
-- Name: failure_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.failure_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failure_likes_id_seq OWNER TO postgres;

--
-- Name: failure_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.failure_likes_id_seq OWNED BY public.failure_likes.id;


--
-- Name: failures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failures (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image_url text,
    video_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.failures OWNER TO postgres;

--
-- Name: failures_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.failures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failures_id_seq OWNER TO postgres;

--
-- Name: failures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.failures_id_seq OWNED BY public.failures.id;


--
-- Name: likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.likes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    experiment_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.likes OWNER TO postgres;

--
-- Name: likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.likes_id_seq OWNER TO postgres;

--
-- Name: likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.likes_id_seq OWNED BY public.likes.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    experiment_id integer,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    comment_id integer
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reset_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: rants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rants (
    id integer NOT NULL,
    text text NOT NULL,
    user_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rants OWNER TO postgres;

--
-- Name: rants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rants_id_seq OWNER TO postgres;

--
-- Name: rants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rants_id_seq OWNED BY public.rants.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO postgres;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: user_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_collections (
    user_id integer NOT NULL,
    experiment_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_collections OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    student_id text,
    research_field text,
    bio text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    is_admin boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: comment_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reports ALTER COLUMN id SET DEFAULT nextval('public.comment_reports_id_seq'::regclass);


--
-- Name: comment_votes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_votes ALTER COLUMN id SET DEFAULT nextval('public.comment_votes_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: experiment_comment_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_comment_reports ALTER COLUMN id SET DEFAULT nextval('public.experiment_comment_reports_id_seq'::regclass);


--
-- Name: experiments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiments ALTER COLUMN id SET DEFAULT nextval('public.experiments_id_seq'::regclass);


--
-- Name: failure_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_comments ALTER COLUMN id SET DEFAULT nextval('public.failure_comments_id_seq'::regclass);


--
-- Name: failure_likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_likes ALTER COLUMN id SET DEFAULT nextval('public.failure_likes_id_seq'::regclass);


--
-- Name: failures id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failures ALTER COLUMN id SET DEFAULT nextval('public.failures_id_seq'::regclass);


--
-- Name: likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes ALTER COLUMN id SET DEFAULT nextval('public.likes_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: rants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rants ALTER COLUMN id SET DEFAULT nextval('public.rants_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: comment_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comment_reports (id, comment_id, user_id, report_reason, created_at) FROM stdin;
\.


--
-- Data for Name: comment_votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comment_votes (id, comment_id, user_id, vote, created_at) FROM stdin;
2	1	6	1	2026-04-26 12:05:25.928588+00
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, content, author_id, experiment_id, created_at, parent_id) FROM stdin;
1	深有同感！我上次也把乙醇当水用了，实验室差点起火。我们同病相怜！	2	1	2026-04-25 19:19:12.124354+00	\N
2	试剂标签模糊是大多数化学事故的元凶，建议大家给所有瓶子都贴超大号标签	3	1	2026-04-25 19:19:12.167064+00	\N
3	数据泄漏的坑我也踩过！当时还以为自己是天才，结果是个笑话	3	3	2026-04-25 19:19:12.209283+00	\N
4	细胞培养污染简直是生物系学生的噩梦，感同身受！	2	4	2026-04-25 19:19:12.248477+00	\N
\.


--
-- Data for Name: experiment_comment_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.experiment_comment_reports (id, comment_id, user_id, report_reason, created_at) FROM stdin;
\.


--
-- Data for Name: experiment_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.experiment_tags (experiment_id, tag_id) FROM stdin;
\.


--
-- Data for Name: experiments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.experiments (id, title, description, category, failure_reason, hypothesis, methodology, lesson_learned, image_url, author_id, created_at, updated_at, ai_report, image_paths, video_urls) FROM stdin;
1	催化剂加错了：将盐酸误用为催化剂的惨痛经历	在合成有机物的过程中，我把实验室的盐酸瓶当成了催化剂加入反应体系。直到反应釜开始冒出大量气泡，我才意识到哪里不对劲。结果是一场精彩的酸雾秀，以及三个月的实验数据付之一炬。	Chemistry	操作失误：试剂混淆	如果正确使用催化剂，有机合成反应应当在3小时内完成	将原料A和原料B在特定温度下混合，加入催化剂后持续搅拌	实验前请认真阅读所有试剂瓶标签，不要因为位置相近就想当然	\N	1	2026-04-25 19:18:29.686579+00	2026-04-25 19:18:29.686579+00	\N	\N	\N
2	电化学电池被我做成了加热器	在测试我自制的电化学电池时，由于电极材料选择失误，整个装置在充电过程中开始大量发热。指导老师赶来时电池已经烧焦，我站在旁边若无其事地看着，假装这是计划的一部分。	Chemistry	材料选择错误导致短路	新型电极材料应能将电池容量提升30%	采用自制电极材料，在标准条件下进行充放电循环测试	在进行大规模测试前，先做小样品验证。电化学实验不是烤肉	\N	1	2026-04-25 19:18:29.744851+00	2026-04-25 19:18:29.744851+00	\N	\N	\N
3	薛定谔的实验：既失败又没失败直到导师来检查	量子光学实验进行了两个月，数据看起来完美无缺。直到导师要求重复实验时，我才发现自己的光学路径上有一个松动的镜片——所有数据都是噪声的艺术品。	Physics	设备问题：光学元件松动	通过纠缠光子对可以观测到量子纠错效应	使用BBO晶体产生纠缠光子，经过系列光学元件后用单光子探测器测量	每次实验前检查所有光学元件的紧固程度。物理实验比量子力学本身更不确定	\N	2	2026-04-25 19:18:59.6787+00	2026-04-25 19:18:59.6787+00	\N	\N	\N
4	机器学习模型训练了一周：验证集准确率99%，真实数据0%	花了一周时间精心调参，在验证集上达到了令人骄傲的99.2%准确率。然而当我把模型部署到真实数据时，效果连随机猜测都不如。后来发现我的训练集和验证集来自同一个被污染的数据源。	Computer Science	数据泄漏导致过拟合	基于Transformer的模型可以在该分类任务上超越当前SOTA	使用预训练BERT微调，经过网格搜索找到最优超参数	永远要有独立的测试集，数据预处理管道的每个环节都要检查泄漏风险	\N	2	2026-04-25 19:18:59.723572+00	2026-04-25 19:18:59.723572+00	\N	\N	\N
5	细胞培养失败记：被污染的培养基和我的心情一样浑浊	历时三个月的细胞培养实验，在第89天发现培养基变色——是细菌污染。实验从头开始，但培养基费用已经花了两万块，导师的脸色和培养基一样不好看。	Biology	实验室污染控制不足	特定基因敲除后，细胞应表现出更强的增殖能力	使用CRISPR-Cas9进行基因编辑，随后进行长期细胞培养观测	无菌操作是生命线，不是建议。每次实验前必须检查超净台的气流状态	\N	3	2026-04-25 19:18:59.82512+00	2026-04-25 19:18:59.82512+00	\N	\N	\N
6	小鼠实验的意外发现：我研究的不是我以为的那种小鼠	整整六个月的行为学实验做完，才发现供应商给我的小鼠基因型与订单不符。所有漂亮的行为数据都需要重新解释，而我的毕业答辩就在三个月后。	Biology	实验材料质量控制缺失	特定基因缺失会导致小鼠出现焦虑相关行为	使用Open Field Test和Morris水迷宫对基因敲除小鼠进行行为学评估	实验动物到手后务必进行基因型鉴定。不要相信任何人，包括供应商	\N	3	2026-04-25 19:18:59.869243+00	2026-04-25 19:18:59.869243+00	\N	\N	\N
7	想用lipid成膜的	aiohvhahhv'pahhvhavghbah'jvuhaevj	Biology	没有加入buffer	\N	\N	\N	\N	4	2026-04-25 19:54:50.556632+00	2026-04-25 19:54:50.556632+00	\N	\N	\N
8	lipid成膜失败	就是在和别人讲话，忘记了接导管，这是个意外	生物学	忘记了加buffer	\N	\N	\N	\N	4	2026-04-26 09:57:24.186485+00	2026-04-26 09:57:24.186485+00	\N	\N	\N
9	停电导致数据全毁实验	当时正在跑第三次重复实验，程序跑到80%突然停电。数据文件损坏无法恢复，三个月的实验数据就这么没了。	Other	实验室突然停电，UPS没电了，主机直接关机	\N	\N	必须要配置稳定的UPS，或者每隔30分钟自动保存一次数据。	\N	5	2026-04-26 10:16:15.208511+00	2026-04-26 10:16:15.208511+00	【验收标记】这句话来自用户编辑后的 Occy 报告# 失败实验报告：停电导致数据全毁实验  \n\n## 实验概要  \n本实验（代号“幽灵进度条”）属跨学科探索性研究（归类为 `Other`），核心目标是完成某算法在真实噪声环境下的三重重复验证。实验周期横跨12周，累计耗电≈37 kWh，咖啡因摄入量≈2.1 mol，精神损耗值暂未校准——但数据确凿：**0% 成功率，100% 数据蒸发率**。  \n\n## 背景与假设  \n无明确科学假设（毕竟我们连“明天实验室会不会跳闸”都还没建模）。唯一隐含前提：*UPS 是个永远醒着的守夜人，而非一只假装充电的电子考拉*。  \n\n## 灾难现场实录  \nT-00:00:00（本地时间 22:17）：程序运行至第三次重复的第80%——进度条如一位即将登顶却突然被拽下山的登山者，戛然而止；  \nT+00:00:01：主机风扇声消失，屏幕变黑，窗外路灯同步熄灭；  \nT+00:05:00：摸黑插上手机照明，发现UPS指示灯呈优雅的暗红色——不是“低电量提醒”，是“我已安详离世”的LED遗言；  \nT+00:30:00：`ls -la data/` 显示所有`.h5`文件大小均为4096字节（Linux的“空壳尊严”）；`h5py.File()` 报错：`OSError: Unable to open file (file is not a valid HDF5 file)` —— 数据已升天，只留墓碑式元数据。三个月心血，化作硬盘里一串悲壮的乱码。  \n\n## 失败根因分析  \n直接原因：市电中断 × UPS失效（电池老化+未定期放电维护）；  \n深层原因：人类对“自动保存”的信仰过于虔诚，堪比中世纪修士抄写《圣经》时坚信墨水永不干涸。  \n\n## 方法论反思  \n原方案依赖“手动存档+最后导出”双保险——实为“单点裸奔+心理安慰剂”。未将数据持久化嵌入计算主循环，等同于用沙堡修核电站冷却塔。  \n\n## 经验教训  \n✅ 立即采购UPS（带智能断电通知+自动休眠脚本）；  \n✅ 强制植入`checkpoint_every(30*60)`逻辑——让程序像考研人背单词一样，每30分钟就虔诚地`torch.save()`一次；  \n✅ 在实验室门后贴纸条：“本室数据脆弱度≈新鲜草莓蛋糕，勿断电，勿手滑，勿心存侥幸”。  \n\n## 结语  \n这次失败没有产出论文，但产出了三条硬核结论：  \n1. 科研的浪漫主义需以电路图打底；  \n2. 所有“临时保存”都是对熵增定律的温柔抵抗；  \n3. 当进度条在80%处消失，它不是终点——而是提醒你：真正的实验，才刚刚开始校准容错边界。  \n致那三个月的数据：愿你们在比特天堂里，跑得比我的代码快，存得比我的U盘稳。我们……下个checkpoint见。	\N	\N
10	视频链接测试实验001	花了两周时间采集数据，发现设备的基线校准从第一天就错了，所有数据作废。	Other	设备校准失误导致全部测量值偏差	\N	\N	使用设备前必须进行三次以上基线验证	\N	5	2026-04-26 10:38:13.520926+00	2026-04-26 10:38:13.520926+00	# 失败实验报告：视频链接测试实验001  \n\n## 实验概要  \n本实验代号“视频链接测试实验001”，隶属研究领域「Other」——一个学术界心照不宣的收容所，专收那些尚未被分类、但导师说“先跑个baseline试试”的项目。目标本是验证某新型流媒体延迟监测模块在多平台下的稳定性。结果：两周、137小时设备值守、42GB原始日志，最终收获一份完美对齐的伪数据集——所有测量值系统性偏移+237ms，误差精度堪比用咖啡机计时器校准原子钟。\n\n## 背景与假设  \n假设：设备出厂校准可靠，基线漂移可忽略（*注：该假设于第1天上午9:03被现实温柔而坚定地撕碎*）。  \n背景：为支撑组内“智能QoE评估框架”课题，本实验需提供高置信度延迟基准。我们甚至为它起了小名：“Linky”，并给它擦了三次防尘布——可惜没擦校准口。\n\n## 灾难现场实录  \nDay 1–14：每日早8点开机、记录、喝第三杯冷咖啡、怀疑人生；  \nDay 15凌晨2:17：对比参考设备时发现——Linky测出的“本地环回延迟”竟比光速还快0.8ms；  \nDay 15上午9:00：颤抖着打开设备手册第7页，“基线校准”章节赫然印着加粗警告：“*未执行≥3次独立基线验证即采集数据，本设备将默认您已自愿加入‘薛定谔的数据’观测者联盟*”。\n\n## 失败根因分析  \n直接原因：基线校准缺失（0次）；  \n深层原因：人类在“设备很新所以肯定准”的认知幻觉面前，脆弱得像没加盐的意大利面；  \n根本原因：把校准仪式感错当成了开箱仪式——而真正的仪式，是三次重复、交叉比对、手写记录、签字画押。\n\n## 方法论反思  \n原方案中“开机即采”流程，实为“信任即漏洞”的经典范式。未嵌入校准-复核-再校准闭环，等同于用体温计测月球表面温度——不是不准，是根本不在同一物理宇宙。\n\n## 经验教训  \n✅ 使用任何设备前，强制执行≥3次独立基线验证（建议含：晨间/午后/深夜各一次，以对抗地球自转带来的玄学干扰）；  \n✅ 校准记录须手写存档（电子文档易删，墨水渍才是科研者的耻辱烙印）；  \n✅ 建议为设备起名后，同步为其设立“校准监护人”岗位——轮值制，带KPI。\n\n## 结语  \n这次失败没有产出数据，但产出了三样硬通货：一份刻进DNA的校准肌肉记忆、一个被全组传阅的《Linky忏悔录》PDF，以及——最珍贵的——对“可重复性”三个字终于有了带痛感的理解。科研不是永不跌倒的平衡木表演，而是不断把摔倒的姿势，编译成下一次起跳的力矩方程。Linky仍在桌上，电源灯微亮，像一句安静的邀约：**“来，这次我们先校准，再相信。”**	\N	{https://www.bilibili.com/video/BV1test12345,https://www.youtube.com/watch?v=dQw4w9WgXcQ}
11	图片上传验收测试实验	六周神经记录实验，最终发现接地线松了，所有波形都是噪声。	Other	接地线松了	\N	\N	\N	\N	5	2026-04-26 11:11:08.316941+00	2026-04-26 11:11:08.316941+00	\N	{/objects/uploads/31c1a777-5ab7-4589-b441-b2a1554899ad}	\N
12	微波炉忘记关了	在哦；hyviasygspbsudbjdxbi	Other	和别人讲话，忘记了	\N	\N	\N	\N	7	2026-04-27 02:36:12.757556+00	2026-04-27 02:36:12.757556+00	# 失败实验报告：微波炉忘记关了  \n\n## 实验概要  \n- **实验标题**：微波炉忘记关了（代号：MWO-2024-ΔT）  \n- **研究领域**：Other（注：经IRB紧急审议，暂归入“人类注意力极限与厨房热力学交叉学科”）  \n- **实验时长**：约3分47秒（从启动至焦糊味突破嗅觉检测阈值）  \n- **核心观测指标**：微波腔内温度梯度、食物碳化程度、室友惊呼分贝值（峰值82 dB）、本人羞愧指数（主观量表：9.6/10）  \n\n## 背景与假设  \n本实验原无主动设计——它诞生于早餐三明治加热的朴素需求。唯一隐含假设为：“人类短期记忆在社交语境下仍能维持对微波计时器的实时监控”。该假设已被证伪，且证伪过程附带轻度烟雾报警器鸣响。  \n\n## 灾难现场实录  \nt=0s：放入三明治，设定90秒；  \nt=12s：隔壁实验室同门探头问：“你看到我那支蓝色荧光笔了吗？”；  \nt=13–210s：展开关于文具地理学的深度讨论（含定位误差分析、借笔伦理简史）；  \nt=211s：鼻腔检测到可疑芳香烃类物质（疑似美拉德反应失控产物）；  \nt=212s：目视确认微波炉内已启动“自燃式碳化协议”——面包边缘呈玄武岩状结晶，芝士熔融态演变为沥青相，转盘以0.3 rpm缓慢旋转，仿佛在举行一场微型葬礼。  \n\n## 失败根因分析  \n根本原因非设备故障，而系**人因系统性失效**：  \n- 认知资源被语言处理模块超额占用（NLP过载）；  \n- 工作记忆缓冲区未设置“微波定时器看门狗进程”；  \n- 缺乏跨模态提醒机制（如：语音交互未绑定物理动作反馈）。  \n简言之：大脑把“微波炉”误标为“已关闭状态”，实则它正以2450 MHz频率默默执行一项单向熵增实验。  \n\n## 方法论反思  \n本实验暴露了“无监督加热范式”的重大缺陷。未来应强制引入双人复核制（一人操作，一人持秒表+嗅觉校准仪），或部署IoT微波伴侣APP（支持微信弹窗+震动手环双重告警）。  \n\n## 经验教训  \n1. 社交对话≠自动暂停计时器；  \n2. “哦”字开头的回应，是科研人员最危险的认知断点；  \n3. 焦糊味是自然界最诚实的peer review。  \n\n## 结语  \n这次失败没有产出数据，却产出了更珍贵的东西：一次对自身认知边界的清晰测绘。在科研的漫长光谱里，成功是明亮的发射线，而失败是深邃的吸收线——它不发光，却真实标记着我们曾抵达的位置。微波炉已冷却，三明治化为哲学灰烬，而我的文献管理软件里，多了一条新笔记标签：`#AttentionIsALimitedResource`。  \n毕竟，所有伟大的发现，都始于一个没关掉的微波炉——和一颗愿意为此写满一页markdown的心。	\N	\N
\.


--
-- Data for Name: failure_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failure_comments (id, failure_id, user_id, content, created_at, parent_id) FROM stdin;
\.


--
-- Data for Name: failure_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failure_likes (id, failure_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: failures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failures (id, user_id, title, description, image_url, video_url, created_at) FROM stdin;
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.likes (id, user_id, experiment_id, created_at) FROM stdin;
1	2	1	2026-04-25 19:19:11.835692+00
2	2	2	2026-04-25 19:19:11.879943+00
3	2	3	2026-04-25 19:19:11.918199+00
4	2	4	2026-04-25 19:19:11.960212+00
5	3	1	2026-04-25 19:19:11.999112+00
6	3	3	2026-04-25 19:19:12.04119+00
7	3	5	2026-04-25 19:19:12.083181+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, content, experiment_id, is_read, created_at, comment_id) FROM stdin;
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, reset_token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: rants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rants (id, text, user_id, created_at) FROM stdin;
1	第 7 次重复实验，结果像随机数生成器。	\N	2026-04-26 16:54:27.078984+00
2	导师说再试一次，我的细胞说不。	\N	2026-04-26 16:54:27.078984+00
3	不是我不严谨，是这个实验有自己的想法。	\N	2026-04-26 16:54:27.078984+00
4	阳性对照阴了，阴性对照阳了，人生也灰了。	\N	2026-04-26 16:54:27.078984+00
5	模型跑了三天，loss 曲线长得像心电图。	\N	2026-04-26 16:54:27.078984+00
6	p=0.051，我的一生之敌，永不妥协。	\N	2026-04-26 16:54:27.078984+00
7	备份硬盘同时坏了两块，三年数据再见。	\N	2026-04-26 16:54:27.078984+00
8	审稿人第三次要我加对照组，我真的没有老鼠了。	\N	2026-04-26 16:54:27.078984+00
9	凌晨四点实验室，陪我的只有离心机轰鸣声。	\N	2026-04-26 16:54:27.078984+00
10	组会结论是「再看看」，这已经是第十八次了。	\N	2026-04-26 16:54:27.078984+00
11	数据集标注错了一半，发现时论文已经投出去。	\N	2026-04-26 16:54:27.078984+00
12	结果完美复现了——别人的结论，不是我的假设。	\N	2026-04-26 16:54:27.078984+00
13	师兄说这个方法成熟，两年了还没跑通。	\N	2026-04-26 16:54:27.078984+00
14	拒稿理由：创新不足。创新到哪里才算足？	\N	2026-04-26 16:54:27.078984+00
15	证明写了 40 页，最后一行发现前提错了。	\N	2026-04-26 16:54:27.078984+00
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, created_at) FROM stdin;
\.


--
-- Data for Name: user_collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_collections (user_id, experiment_id, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, display_name, student_id, research_field, bio, avatar_url, created_at, updated_at, email, is_admin) FROM stdin;
1	dr_failure	5b19053abc58dfb6d0563a35254f134e4c50c8b7b8d1d1412fb0d494561c516a	失败博士	2021001	Chemistry	\N	\N	2026-04-25 19:18:09.125515+00	2026-04-25 19:18:09.125515+00	\N	f
2	quantum_loser	5b19053abc58dfb6d0563a35254f134e4c50c8b7b8d1d1412fb0d494561c516a	量子失败者	2020042	Physics	\N	\N	2026-04-25 19:18:29.517968+00	2026-04-25 19:18:29.517968+00	\N	f
3	bio_disaster	5b19053abc58dfb6d0563a35254f134e4c50c8b7b8d1d1412fb0d494561c516a	生物灾难	2022019	Biology	\N	\N	2026-04-25 19:18:29.568191+00	2026-04-25 19:18:29.568191+00	\N	f
4	jinbing	bfe8a997dc755770fadebe547b52e227c250e0ade0070621b6853c7957fa98b2	king	\N	生物学	\N	\N	2026-04-25 19:23:44.303622+00	2026-04-25 19:23:44.303622+00	\N	f
5	acceptance_test_001	fd9ea6e95d5e7c71f0f42fa4119c5e2ff3fbe031de851a74b1bae145c59b377d	验收测试员	\N	\N	\N	\N	2026-04-26 10:13:17.276135+00	2026-04-26 10:13:17.276135+00	\N	f
6	vote_tester	ff6e35c39bec2efc32ca1fd67d876f4704ce04b234f684982711743a82c35ad9	投票测试员	\N	\N	\N	\N	2026-04-26 12:05:25.708415+00	2026-04-26 12:05:25.708415+00	\N	f
8	testai_x7k2	1f45162f7c014ce4e38e577cc156e4a01228fff1356dc84284ebb87122d6e47d	Test User	\N	\N	\N	\N	2026-04-26 14:50:23.092803+00	2026-04-26 14:50:23.092803+00	\N	f
7	testai99	1f45162f7c014ce4e38e577cc156e4a01228fff1356dc84284ebb87122d6e47d	Test AI	\N	\N	\N	\N	2026-04-26 14:49:39.825263+00	2026-04-26 14:49:39.825263+00	\N	t
9	test	f2251e370ae489542f32cbff91e10fad6c9dff30bddb8411ed46314acdd25fb3	neo	\N	biology	\N	\N	2026-04-26 16:39:06.007899+00	2026-04-26 16:39:06.007899+00	test@somemail.com	f
\.


--
-- Name: comment_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comment_reports_id_seq', 1, false);


--
-- Name: comment_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comment_votes_id_seq', 2, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 4, true);


--
-- Name: experiment_comment_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.experiment_comment_reports_id_seq', 1, false);


--
-- Name: experiments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.experiments_id_seq', 12, true);


--
-- Name: failure_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.failure_comments_id_seq', 1, false);


--
-- Name: failure_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.failure_likes_id_seq', 1, false);


--
-- Name: failures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.failures_id_seq', 1, false);


--
-- Name: likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.likes_id_seq', 9, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_resets_id_seq', 1, false);


--
-- Name: rants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rants_id_seq', 15, true);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tags_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 9, true);


--
-- Name: comment_reports comment_reports_comment_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_comment_id_user_id_unique UNIQUE (comment_id, user_id);


--
-- Name: comment_reports comment_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_pkey PRIMARY KEY (id);


--
-- Name: comment_votes comment_votes_comment_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_user_id_unique UNIQUE (comment_id, user_id);


--
-- Name: comment_votes comment_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: experiment_comment_reports experiment_comment_reports_comment_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_comment_reports
    ADD CONSTRAINT experiment_comment_reports_comment_id_user_id_unique UNIQUE (comment_id, user_id);


--
-- Name: experiment_comment_reports experiment_comment_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_comment_reports
    ADD CONSTRAINT experiment_comment_reports_pkey PRIMARY KEY (id);


--
-- Name: experiment_tags experiment_tags_experiment_id_tag_id_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_tags
    ADD CONSTRAINT experiment_tags_experiment_id_tag_id_pk PRIMARY KEY (experiment_id, tag_id);


--
-- Name: experiments experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_pkey PRIMARY KEY (id);


--
-- Name: failure_comments failure_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_comments
    ADD CONSTRAINT failure_comments_pkey PRIMARY KEY (id);


--
-- Name: failure_likes failure_likes_failure_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_likes
    ADD CONSTRAINT failure_likes_failure_id_user_id_unique UNIQUE (failure_id, user_id);


--
-- Name: failure_likes failure_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_likes
    ADD CONSTRAINT failure_likes_pkey PRIMARY KEY (id);


--
-- Name: failures failures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failures
    ADD CONSTRAINT failures_pkey PRIMARY KEY (id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: likes likes_user_id_experiment_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_experiment_id_unique UNIQUE (user_id, experiment_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_user_comment_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_comment_unique UNIQUE (user_id, comment_id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_reset_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_reset_token_unique UNIQUE (reset_token);


--
-- Name: rants rants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rants
    ADD CONSTRAINT rants_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_unique UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_collections user_collections_user_id_experiment_id_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_collections
    ADD CONSTRAINT user_collections_user_id_experiment_id_pk PRIMARY KEY (user_id, experiment_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: comment_reports comment_reports_comment_id_failure_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_comment_id_failure_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.failure_comments(id) ON DELETE CASCADE;


--
-- Name: comment_reports comment_reports_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comment_votes comment_votes_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_votes comment_votes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_experiment_id_experiments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_experiment_id_experiments_id_fk FOREIGN KEY (experiment_id) REFERENCES public.experiments(id);


--
-- Name: comments comments_parent_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_comments_id_fk FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: experiment_comment_reports experiment_comment_reports_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_comment_reports
    ADD CONSTRAINT experiment_comment_reports_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: experiment_comment_reports experiment_comment_reports_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_comment_reports
    ADD CONSTRAINT experiment_comment_reports_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: experiment_tags experiment_tags_experiment_id_experiments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_tags
    ADD CONSTRAINT experiment_tags_experiment_id_experiments_id_fk FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE;


--
-- Name: experiment_tags experiment_tags_tag_id_tags_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiment_tags
    ADD CONSTRAINT experiment_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: experiments experiments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: failure_comments failure_comments_failure_id_failures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_comments
    ADD CONSTRAINT failure_comments_failure_id_failures_id_fk FOREIGN KEY (failure_id) REFERENCES public.failures(id) ON DELETE CASCADE;


--
-- Name: failure_comments failure_comments_parent_id_failure_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_comments
    ADD CONSTRAINT failure_comments_parent_id_failure_comments_id_fk FOREIGN KEY (parent_id) REFERENCES public.failure_comments(id) ON DELETE CASCADE;


--
-- Name: failure_comments failure_comments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_comments
    ADD CONSTRAINT failure_comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: failure_likes failure_likes_failure_id_failures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_likes
    ADD CONSTRAINT failure_likes_failure_id_failures_id_fk FOREIGN KEY (failure_id) REFERENCES public.failures(id) ON DELETE CASCADE;


--
-- Name: failure_likes failure_likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failure_likes
    ADD CONSTRAINT failure_likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: failures failures_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failures
    ADD CONSTRAINT failures_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_experiment_id_experiments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_experiment_id_experiments_id_fk FOREIGN KEY (experiment_id) REFERENCES public.experiments(id);


--
-- Name: likes likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_experiment_id_experiments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_experiment_id_experiments_id_fk FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rants rants_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rants
    ADD CONSTRAINT rants_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_collections user_collections_experiment_id_experiments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_collections
    ADD CONSTRAINT user_collections_experiment_id_experiments_id_fk FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE;


--
-- Name: user_collections user_collections_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_collections
    ADD CONSTRAINT user_collections_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lg8h6A7vuzgu4ceQdescaoAmbZepUQoOECiAWlbRjqd6FRE2fRgxlCeJhqGyk2g

