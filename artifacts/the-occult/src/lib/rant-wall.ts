export type WallRant = {
  id: string;
  avatar: string;
  name: string;
  field: string;
  text: string;
  time: string;
};

export const INITIAL_WALL_RANTS: WallRant[] = [
  { id: "1",  avatar: "🐼", name: "熊猫博士",   field: "Chemistry",    text: "第 7 次重复实验，结果像随机数生成器。",              time: "3分钟前"  },
  { id: "2",  avatar: "🦉", name: "熬夜猫头鹰", field: "Biology",      text: "导师说再试一次，我的细胞说不。",                    time: "11分钟前" },
  { id: "3",  avatar: "🐸", name: "青蛙选手",   field: "Physics",      text: "不是我不严谨，是这个实验有自己的想法。",              time: "28分钟前" },
  { id: "4",  avatar: "🦊", name: "野生研究员", field: "Biology",      text: "阳性对照阴了，阴性对照阳了，人生也灰了。",            time: "1小时前"  },
  { id: "5",  avatar: "🐙", name: "八脚打工仔", field: "CS",           text: "模型跑了三天，loss 曲线长得像心电图。",               time: "2小时前"  },
  { id: "6",  avatar: "🦁", name: "倔强狮子",   field: "Materials",    text: "p=0.051，我的一生之敌，永不妥协。",                  time: "3小时前"  },
  { id: "7",  avatar: "🐺", name: "独狼科研",   field: "Chemistry",    text: "备份硬盘同时坏了两块，三年数据再见。",                time: "5小时前"  },
  { id: "8",  avatar: "🐰", name: "焦虑兔子",   field: "Psychology",   text: "审稿人第三次要我加对照组，我真的没有老鼠了。",        time: "8小时前"  },
  { id: "9",  avatar: "🦋", name: "迷途蝴蝶",   field: "Ecology",      text: "凌晨四点实验室，陪我的只有离心机轰鸣声。",            time: "昨天"     },
  { id: "10", avatar: "🐨", name: "困倦考拉",   field: "Neuroscience", text: "组会结论是「再看看」，这已经是第十八次了。",          time: "昨天"     },
  { id: "11", avatar: "🦑", name: "墨迹学者",   field: "CS",           text: "数据集标注错了一半，发现时论文已经投出去。",          time: "2天前"    },
  { id: "12", avatar: "🐳", name: "深海研究员", field: "Marine",       text: "结果完美复现了——别人的结论，不是我的假设。",         time: "2天前"    },
  { id: "13", avatar: "🦝", name: "浣熊学长",   field: "Biochem",      text: "师兄说这个方法成熟，两年了还没跑通。",                time: "3天前"    },
  { id: "14", avatar: "🐯", name: "愤怒老虎",   field: "Physics",      text: "拒稿理由：创新不足。创新到哪里才算足？",              time: "4天前"    },
  { id: "15", avatar: "🦔", name: "多刺刺猬",   field: "Math",         text: "证明写了 40 页，最后一行发现前提错了。",              time: "5天前"    },
];
