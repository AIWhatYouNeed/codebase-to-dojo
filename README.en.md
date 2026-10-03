# Codebase to Dojo

> An enhanced version of [zarazhangrui/codebase-to-course](https://github.com/zarazhangrui/codebase-to-course).

A Claude Code Skill that turns **any codebase** into a beautiful, interactive single-page HTML course.

Point it at a repo. Get back a stunning, self-contained course that teaches how the code works — with scroll-based navigation, animated visualizations, embedded quizzes, and code-with-plain-English side-by-side translations.

---

## 🆚 Enhanced vs Original

This version adds significant improvements on top of the original:

| Feature | Original | Enhanced |
|---------|:--------:|:--------:|
| **Output Structure** | Single HTML file | Directory-based output (modules/*.html + build.sh assembly) |
| **AI Assistant Sidebar** | ❌ | ✅ Built-in, defaults ON, context-aware, OpenAI / Claude API support |
| **Course Outline Sidebar** | ❌ | ✅ Auto-generated from modules, scroll-spy, collapsible |
| **Notes Sidebar** | ❌ | ✅ Select text to take notes, Markdown export |
| **Parallel Build Path** | ❌ | ✅ Module Briefs + sub-agents for complex codebases |
| **Group Chat Animation** | Optional | ✅ **Mandatory** (at least one per course) |
| **Message Flow Animation** | Optional | ✅ **Mandatory** (at least one per course) |
| **Quiz Types** | Basic | Multiple (multiple-choice, scenario, drag-and-drop, spot-the-bug) |
| **Reference Files** | 2 (design-system, interactive-elements) | Full 11 (adds content-philosophy, gotchas, module-brief-template, build.sh, _base.html, _footer.html, main.js, styles.css) |

---

## 🎯 Who This Is For

**"Vibe coders"** — people who build software by instructing AI coding tools in natural language, without a traditional CS education.

You've built something yourself (without reading the code), or you found an interesting open-source project on GitHub and want to understand how it works. Either way, you want to know **what's happening under the hood**.

**Your goals are practical, not academic:**
- Better **steer AI coding tools** (make smarter architectural and tech stack decisions)
- **Detect when AI is wrong** (spot hallucinations, catch bad patterns)
- **Intervene when AI gets stuck** (break out of bug loops)
- Talk to engineers without feeling lost

You're not trying to become a software engineer. You want coding as a superpower.

---

## ✨ What the Course Looks Like

The output is a **directory** containing pre-built `styles.css`, `main.js`, per-module HTML files, and an assembled `index.html` — open it directly in the browser with no setup required (only external dependency: Google Fonts CDN).

### Core Interactive Elements (**Every Course Must Include All of These**)

| Element | Description |
|---------|-------------|
| **Group Chat Animation** | iMessage/WeChat-style conversations between components — one of the most engaging elements |
| **Message Flow / Data Flow Animation** | Step-by-step packet animation between actors, showing data flow clearly |
| **Code ↔ Plain English Translation** | Real code with syntax highlighting on the left, line-by-line explanation on the right, **at least one per module** |
| **Interactive Quizzes** | Tests *application* not memorization (e.g., "A user reports stale data after switching pages — where would you look first?"), **at least one per module** |
| **Glossary Tooltips** | Hover any technical term for a plain-English definition, **on first use per module** |

### Optional Enhancing Elements

- **Architecture diagrams / layer toggles** — show/hide code layers with one click
- **Pattern Cards** — design pattern cards
- **Hero Visual** — a dominant visual that teaches the core concept at a glance

### Sidebar Features (**All Default ON**)

| Sidebar | Description |
|---------|-------------|
| **💬 AI Assistant** | Floating button opens a chat panel that auto-captures the current module as context. Supports selection quoting, multi-session, streaming output, Stop button, history compression |
| **📒 Personal Notes** | Select text to quickly take notes, Markdown export, jump-to-source |
| **📑 Course Outline** | Auto-generated from modules, scroll-spy highlights current position, collapsible, state persists |

### Visual Design

- **Warm palette** — off-white backgrounds, warm grays, **no purple gradients**
- **Bold accent color** — vermillion, coral, teal (pick one that fits the codebase's vibe)
- **Distinctive typography** — Bricolage Grotesque for headings, DM Sans for body, JetBrains Mono for code
- **Generous whitespace** — max 2-3 sentences per screen, the rest visuals
- **Dark code blocks** — IDE-style, Catppuccin-inspired syntax highlighting
- **Alternating backgrounds** — even/odd modules use different warm tones for visual rhythm

---

## 🚀 How to Use

### As a Claude Code Skill

```bash
cp -r codebase-to-dojo ~/.claude/skills/
```

Then open any project in Claude Code and say:

> "Turn this codebase into an interactive course"

### Trigger Phrases

- "Turn this into a course"
- "Explain this codebase interactively"
- "Make a course from this project"
- "Teach me how this code works"
- "Interactive tutorial from this code"

### Workflow

The skill automatically executes these phases:

```
Phase 1: Codebase Analysis
   ↓ Deep read of all key files, trace data flows, identify "actors", map communication
Phase 2: Curriculum Design
   ↓ Design the teaching arc for 4-6 modules
Phase 2.5: Module Briefs (complex codebases only)
   ↓ Write module briefs, pre-extract code snippets, prepare for parallel build
Phase 3: Build the Course
   ↓ Simple codebases → Sequential path; complex → Parallel path (sub-agents write modules concurrently)
Phase 4: Review and Open
   ↓ Run build.sh to assemble index.html, open in browser
```

### Two Build Paths

| Path | Best For | Approach |
|------|----------|----------|
| **Sequential** | Simple codebases: single-purpose CLI, small web app, library, ≤5 modules | One agent writes modules one at a time |
| **Parallel** | Complex codebases: full-stack app, multiple services, content-heavy site, monorepo, ≥6 modules | Write Module Briefs first (with pre-extracted code), then distribute to multiple sub-agents concurrently |

---

## 📂 Project Structure

```
codebase-to-dojo/
├── SKILL.md                              # Main skill instructions (Claude Code reads this)
└── references/                           # Reference files (read on demand during skill run)
    ├── _base.html                        # HTML shell template
    ├── _footer.html                      # HTML footer
    ├── build.sh                          # Assembly script (cat modules → index.html)
    ├── content-philosophy.md             # Content philosophy: visual density, metaphors, quiz design
    ├── design-system.md                  # CSS design spec: colors, typography, layout
    ├── gotchas.md                        # Common failure points checklist
    ├── interactive-elements.md           # Interactive element implementation patterns
    ├── main.js                           # All interaction logic (AI sidebar, notes, outline, etc.)
    ├── module-brief-template.md          # Module brief template (parallel path)
    └── styles.css                        # Complete stylesheet
```

---

## 🧠 Design Philosophy

### Build First, Understand Later

This inverts traditional CS education. The old way: memorize concepts for years → eventually build something → finally see the point (most people quit before step 3). This way: **build something → experience it working → now understand how it works.**

### Show, Don't Tell

Every screen is at least 50% visual. Max 2-3 sentences per text block. If something can be a diagram, animation, or interactive element — it shouldn't be a paragraph.

### Quizzes Test Doing, Not Knowing

No "What does API stand for?" Instead: "A user reports stale data after switching pages — where would you look first?" Quizzes test whether you can *use* what you learned to solve a new problem.

### No Recycled Metaphors

Each concept gets a metaphor that fits *that specific idea*. A database is a library with a card catalog. Auth is a bouncer checking IDs. API rate limiting is a nightclub with a capacity limit. **Never reuse the same metaphor twice**, never default to the "restaurant" metaphor (it's overused).

### Original Code Only

Code snippets are exact copies from the codebase — never modified or simplified. The learner should be able to open the actual file and see the exact same code they learned from. Instead of editing code to make it shorter, *choose* naturally short, punchy snippets (5-10 lines) that illustrate the concept well.

---

## ⚠️ Mandatory Rules (Skill Must Enforce)

1. **Never regenerate** `styles.css` or `main.js` — always copy verbatim from references
2. Module files contain **only `<section>` content** — no `<html>`, `<head>`, `<body>`, `<style>`, or `<script>` tags
3. Every course **must include**: Group Chat animation + Message Flow animation + per-module Code↔English translation + per-module Quiz + first-use Glossary Tooltip per module
4. Code blocks use `white-space: pre-wrap` — non-technical users don't need horizontal scrollbars
5. Use `scroll-snap-type: y proximity` (not `mandatory`)
6. Max 2-3 sentences per screen — convert excess text to visuals
7. Metaphors are **never reused**, never default to "restaurant/kitchen"
8. Code snippets are **never modified** — only select naturally short ones

---

Built with ❤️ by [Zara](https://x.com/zarazhangrui) + Claude Code.