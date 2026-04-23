# BBT LearnOS — Claude Code Master Blueprint
## Big Binary Tech | bbt.edu.pk | bigbinarytech.com

---

## WHAT THIS PROJECT IS

BBT LearnOS is a disruptive career operating system — not a course platform.
It trains learners through 7 deep-tech tracks, credentials them with verifiable
skill badges, and connects top graduates to employment through the BBT software
arm or partner employers. The physical franchise network (BBT Education) feeds
learners into the online platform.

**Two connected businesses:**
- BBT Education (bbt.edu.pk) — training arm, PSDA + NAVTTC + Cisco affiliated
- Big Binary Tech (bigbinarytech.com) — software arm, absorbs top graduates
- talent.bigbinarytech.com — staff augmentation + Hire-a-Team marketplace

**7 Career Tracks:**
01 GenAI + Agentic AI
02 Cloud + MLOps
03 Odoo ERP Development
04 AI-Integrated Full Stack
05 Cybersecurity
06 UI/UX + Brand Design
07 AI Marketing + Sales (Shopify inside this track)

**Learner Pathway:** Train → Intern → Shadow → Expert → Absorbed/Placed

**Geographic Sequence:** Pakistan launch → MENA (UAE, Saudi) → Global English

---

## HOW TO USE THIS PROJECT

This is a Claude Code project. All files here are instructions, context, and
memory for Claude when building the platform. Read every file before starting
any task. The files are:

- CLAUDE.md        — this file, project overview and rules
- AGENTS.md        — which Claude agent handles which task
- MEMORY.md        — locked decisions that must never change
- CONTEXT.md       — current build state and what is done vs pending
- SKILLS.md        — technical patterns and reusable prompts per domain
- TESTS.md         — full test suite specification (security + functional)
- BUILD.md         — step-by-step build sequence with exact prompts

**Rule:** Read MEMORY.md first on every session. Never contradict decisions in MEMORY.md.

---

## CONTACT + BRAND

Company: Big Binary Tech (BBT)
Address: 444-Q Phase 2 DHA Lahore
Contact: info@bigbinarytech.com | 0326-0188811
Websites: bbt.edu.pk | bigbinarytech.com | bigbinaryerp.com

Brand: Bebas Neue (display), DM Sans (body), DM Mono (labels)
Colors: Navy #0d0d2e | Indigo #2E3192 | Orange #F7941D

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
