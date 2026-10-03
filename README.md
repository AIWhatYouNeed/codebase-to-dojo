# Codebase to Course（进阶版）

> 基于 [zarazhangrui/codebase-to-course](https://github.com/zarazhangrui/codebase-to-course) 的增强版本。

一个 Claude Code Skill，能把**任意代码仓库**转换成一个漂亮、可交互的**单页 HTML 课程**。

指一个仓库给它，它会生成一个精致的、自包含的课程，教你代码背后的运作原理 —— 滚动导航、动画可视化、嵌入式测验、代码 ↔ 大白话对照翻译，**全部都有**。

---

## 🆚 进阶版 vs 原版

这个版本在原版基础上做了大量增强：

| 特性 | 原版 | 进阶版 |
|------|:----:|:------:|
| **输出结构** | 单个 HTML 文件 | 目录化输出（modules/*.html + build.sh 拼接） |
| **AI 助手侧边栏** | ❌ | ✅ 内置，默认开启，上下文感知，支持 OpenAI / Claude API |
| **目录大纲侧边栏** | ❌ | ✅ 自动从模块生成，滚动高亮，可折叠 |
| **个人笔记侧边栏** | ❌ | ✅ 选中文本直接加笔记，支持 Markdown 导出 |
| **并行构建路径** | ❌ | ✅ 复杂仓库可用 Module Briefs + 子代理并行写模块 |
| **Group Chat 动画** | 可选 | ✅ **强制**（每个课程必须至少一个） |
| **Message Flow 动画** | 可选 | ✅ **强制**（每个课程必须至少一个） |
| **Quiz 类型** | 基础 | 多种（多选、场景题、拖拽排序、找 bug） |
| **参考文件** | 2 个（design-system、interactive-elements） | 完整 11 个（新增 content-philosophy、gotchas、module-brief-template、build.sh、_base.html、_footer.html、main.js、styles.css） |

---

## 🎯 目标用户

**"氛围型程序员"** —— 靠自然语言指令 AI 写代码、没有传统计算机科学背景的开发者。

你可能自己造过东西（从没看过代码），或者在 GitHub 上发现了一个很酷的开源项目想理解它的实现方式。无论哪种，你都想搞清楚**它在底层到底做了什么**。

**你的目标是实用的，不是学术的：**
- 更好地**指挥 AI 编码工具**（做出更聪明的架构和技术栈决策）
- 检测 AI 什么时候**错了**（发现幻觉、识别坏模式）
- 当 AI 卡住时能**介入**（跳出 bug 循环）
- 和工程师交流时**不懵圈**

你不想成为一个软件工程师。你想让编码成为你的超能力。

---

## ✨ 课程长什么样

输出是一个**目录**，包含预构建的 `styles.css`、`main.js`、每个模块的 HTML 文件，以及一个组装好的 `index.html` —— 直接在浏览器里打开就行，无需任何配置（唯一外部依赖：Google Fonts CDN）。

### 核心交互元素（**每个课程必须全部包含**）

| 元素 | 说明 |
|------|------|
| **Group Chat 动画** | 组件之间的 iMessage/微信风格"群聊"对话，是最具吸引力的元素之一 |
| **Message Flow / Data Flow 动画** | 组件之间逐步推进的数据包动画，清晰展示数据流向 |
| **代码 ↔ 大白话对照** | 左边真实代码（语法高亮），右边逐行解释含义，**每个模块至少一个** |
| **互动测验** | 考"应用能力"而非"记忆力"（例："用户反馈数据过时了你先看哪"），**每个模块至少一个** |
| **术语悬浮提示** | 鼠标悬停技术术语就显示通俗解释，**每个模块首次出现时都要 tooltip** |

### 可选增强元素

- **架构图 / 层级切换** —— 一键显示/隐藏代码层
- **Pattern Cards** —— 设计模式卡片
- **Hero Visual** —— 主导视觉，占据整个屏幕，一眼教会核心概念

### 侧边栏功能（**全部默认开启**）

| 侧边栏 | 说明 |
|--------|------|
| **💬 AI 助手** | 浮动按钮打开聊天面板，自动捕获当前模块作为上下文，支持选中文本加引用、多会话、流式输出、Stop 按钮、历史压缩 |
| **📒 个人笔记** | 选中文本快速加笔记，支持 Markdown 导出、源码跳转、拖拽排序 |
| **📑 目录大纲** | 自动从模块生成，滚动高亮当前位置，可折叠，状态持久化 |

### 视觉设计

- **温暖的调色板** —— 米白背景、暖灰、**非紫渐变**
- **大胆的强调色** —— 朱红、珊瑚、青绿（看代码库气质选一个）
- **有个性的字体** —— 标题用 Bricolage Grotesque，正文 DM Sans，代码 JetBrains Mono
- **宽松留白** —— 每个屏幕最多 2-3 句文字，其余都是视觉
- **深色代码块** —— IDE 风格，Catppuccin 系语法高亮
- **交替背景** —— 奇偶模块用不同暖色调，营造视觉节奏

---

## 🚀 使用方式

### 作为 Claude Code Skill

```bash
cp -r codebase-to-course ~/.claude/skills/
```

然后在任意项目中启动 Claude Code，说：

> "Turn this codebase into an interactive course"

### 触发语

- "Turn this into a course"
- "Explain this codebase interactively"
- "Make a course from this project"
- "Teach me how this code works"
- "Interactive tutorial from this code"

### 工作流程

Skill 会按以下阶段自动执行：

```
Phase 1: 代码库分析
   ↓ 深度阅读所有关键文件，追踪数据流，识别"角色"，梳理通信方式
Phase 2: 课程设计
   ↓ 设计 4-6 个模块的教学弧线
Phase 2.5: 模块简报（仅复杂仓库）
   ↓ 写 module briefs，预提取代码片段，为并行构建做准备
Phase 3: 构建课程
   ↓ 简单仓库走 Sequential 路径，复杂仓库走 Parallel 路径（子代理并行写模块）
Phase 4: 审查与打开
   ↓ 运行 build.sh 组装 index.html，在浏览器中打开
```

### 两条构建路径

| 路径 | 适用场景 | 方式 |
|------|----------|------|
| **Sequential（顺序）** | 简单仓库：单用途 CLI、小型 Web App、库、≤5 个模块 | 一个代理依次写每个模块 |
| **Parallel（并行）** | 复杂仓库：全栈应用、多服务、内容密集站点、monorepo、≥6 个模块 | 先写 Module Briefs（含预提取代码），再分发给多个子代理同时写 |

---

## 📂 项目结构

```
codebase-to-course/
├── SKILL.md                              # 主技能指令（Claude Code 读这个）
└── references/                           # 参考文件（Skill 运行时按需读取）
    ├── _base.html                        # HTML 外壳模板
    ├── _footer.html                      # HTML 尾部
    ├── build.sh                          # 组装脚本（cat 模块 → index.html）
    ├── content-philosophy.md             # 内容哲学：视觉密度、比喻、测验设计
    ├── design-system.md                  # CSS 设计规范：颜色、字体、布局
    ├── gotchas.md                        # 常见坑点检查清单
    ├── interactive-elements.md           # 互动元素实现模式
    ├── main.js                           # 所有交互逻辑（AI 侧边栏、笔记、大纲等）
    ├── module-brief-template.md          # 模块简报模板（并行路径用）
    └── styles.css                        # 完整样式表
```

---

## 🧠 设计哲学

### 先造后懂

颠覆传统 CS 教育。旧方式：背概念 N 年 → 终于造点东西 → 才明白意义（大部分人第 3 步前就放弃了）。新方式：**先造 → 看到它跑起来 → 现在理解它怎么运作**。

### 展示 > 说教

每个屏幕至少 50% 是视觉元素。文字块不超过 2-3 句。能变成图、动画、交互元素的，绝不写成段落。

### 测验考"做"不考"知"

不问"API 是什么缩写"，问"用户反馈数据过时了你先看哪"。测验测试你能不能**用**学到的东西解决新问题。

### 原创比喻

每个概念配一个**专属**比喻。数据库 = 带卡片目录的图书馆，认证 = 查身份证的保镖，限流 = 夜总会容量限制。**永远不用同一个比喻两次**，永远不默认"餐厅"比喻（太滥了）。

### 真实代码零修改

代码片段是仓库里的**原样拷贝** —— 绝不简化、绝不修改。学习者应该能打开实际文件看到一模一样的代码。与其编辑代码，不如在仓库里选一段天生就短的（5-10 行）能说明问题的片段。

---

## ⚠️ 强制规则（Skill 运行时必须遵守）

1. **永不修改** `styles.css` 或 `main.js` —— 从 references 直接复制
2. 模块文件**只含 `<section>` 内容** —— 不要 `<html>`、`<head>`、`<body>`、`<style>`、`<script>`
3. 每门课必须包含 **Group Chat 动画** + **Message Flow 动画** + 每个模块的 **代码 ↔ 大白话对照** + 每个模块的 **Quiz** + 每个模块首次出现的 **术语 Tooltip**
4. 代码块使用 `white-space: pre-wrap` —— 非技术用户不需要水平滚动条
5. 使用 `scroll-snap-type: y proximity`（不是 `mandatory`）
6. 每屏最多 2-3 句文字，超过就转视觉
7. 比喻**绝不重复**，绝不默认"餐厅/厨房"
8. 代码片段**绝不修改**，只选天生短的

---

Built with ❤️ by [Zara](https://x.com/zarazhangrui) + Claude Code.
中文版进阶版维护中。