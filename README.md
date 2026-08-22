# 🏆 WeightTracker · 2026 秋季三人减重决战系统

> **核心誓言**：  
> **“为自己瘦下去，把这件事作为责任，作为理想。”**  
> 不找借口 · 真实记录 · 早晚双测 · 责任捆绑 · 顶峰相见

---

## 📖 项目简介

专为 **刘钢、张庭磊、卢轩** 三人打造的 2026 秋季（8月24日 — 9月30日，共 38 天）减重决战打卡系统。  
告别传统表格的枯燥数字输入，以**手机端优先的暗黑燃脂风 Web App**呈现，开源公开托管于 GitHub，微信群点击链接即可秒级查看大盘与上秤打卡。

---

## ✨ 核心特色功能

1. ⚖️ **拟真机械刻度盘手势交互**：手指左右平滑滑动刻度尺，物理惯性与吸附动效（0.1kg 精度），告别枯燥键盘输入。
2. 📈 **三人同台竞技 PK 折线图**：基于 Chart.js 打造 38 天同台曲线，直观对比三人减重斜率与差距。
3. 📅 **38 天 GitHub 全勤打卡热力图**：绿色全勤、黄色半打卡、红色缺席，点击任意日期查看当日全员明细。
4. 🔥 **狼性教练智能诊断引擎**：根据早晚温差模型与阶段减重里程碑，秒级输出犀利短评激发斗志。
5. 🚨 **铁血惩罚记账本**：早 11:00 / 晚 24:00 逾期亮红灯记账，罚 50 个俯卧撑 / 爬楼 10 层。
6. 🖼️ **9:16 Canvas 高清战报海报生成**：一键渲染精美战报长图，支持保存发微信群 / 朋友圈。
7. 📢 **一键复制微信群催促令**：点击未打卡兄弟头像旁的【📢 催TA】，自动复制扎心催打卡文案。
8. ⚙️ **基准与目标自主设定**：支持在 8/24 晨间初始化誓师仪式中调整初始体重与 9/30 目标。

---

## 🚀 本地运行与体验

1. 打开终端进入项目目录：
   ```bash
   cd /Users/insistgang/Desktop/weight-tracker
   ```
2. 启动本地静态服务器：
   ```bash
   python3 -m http.server 8080
   ```
3. 在浏览器（或手机局域网）打开：`http://localhost:8080`

---

## 🌐 部署到 GitHub Pages（完全公开免登录）

1. 在你的 GitHub 账号（`insistgang`）下新建一个公开仓库：`weight-tracker`
2. 在项目根目录执行推送命令：
   ```bash
   cd /Users/insistgang/Desktop/weight-tracker
   git init
   git add .
   git commit -m "feat: initial commit of 2026 WeightTracker"
   git branch -M main
   git remote add origin https://github.com/insistgang/weight-tracker.git
   git push -u origin main
   ```
3. 进入 GitHub 仓库设置：`Settings` $\rightarrow$ `Pages` $\rightarrow$ Source 选择 `Deploy from a branch` (Branch: `main` / `root`) $\rightarrow$ 保存。
4. 稍等 1~2 分钟，即可获得公开访问链接：  
   👉 **`https://insistgang.github.io/weight-tracker/`**

---

## 📂 文件目录结构

```text
/Users/insistgang/Desktop/weight-tracker/
├── index.html         # 核心单页应用（PWA 响应式布局）
├── PRD.md             # 产品需求文档
├── README.md          # 项目介绍与部署说明
├── css/
│   └── style.css      # 拟真机械刻度盘与暗黑动效样式
└── js/
    ├── app.js         # 主状态管理与交互逻辑
    ├── scale.js       # 拟真刻度盘手势交互引擎
    ├── coach.js       # 狼性教练智能诊断引擎
    ├── charts.js      # 三人 PK 折线图与热力图引擎
    ├── poster.js      # Canvas 9:16 战报长图生成器
    └── storage.js     # 数据持久化存储层
```
