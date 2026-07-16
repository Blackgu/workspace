# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260628-001] best_practice

**Logged**: 2026-06-28T17:37:00+08:00
**Priority**: high
**Status**: promoted
**Area**: config

### Summary
记账统一走 SQLite 数据库（data/ledger.db），不再分散写入 memory/ 日记文件

### Details
系统有两套记账入口：
1. `scripts/ledger.js` → `data/ledger.db`（SQLite，结构化，完整）
2. `memory/YYYY-MM-DD.md`（日记文件，手工维护）

2026-06-26 和 2026-06-28 的两笔装修支出只写入了日记文件，未同步数据库，导致查询时出现2条遗漏。根本原因是没有在 AGENTS.md 或 MEMORY.md 中记录"统一走数据库"这条规则。

### Suggested Action
- MEMORY.md 添加"记账规范"章节，明确：所有记账操作必须通过 `scripts/ledger.js add` 写入数据库
- 日记文件仅作摘要参考，不作为主要记账入口

### Metadata
- Source: user_feedback
- Related Files: scripts/ledger.js, data/ledger.db, memory/2026-06-28.md, MEMORY.md
- Tags: ledger, bookkeeping, workflow

---

## [LRN-20260716-001] correction

**Logged**: 2026-07-16T07:39:28+08:00
**Priority**: high
**Status**: pending
**Area**: config

### Summary
区分 cron job 的 payload 模型与当前主会话模型，说明时不得混淆。

### Details
用户强调本次要求仅将失败的 cron job 切换为 deepseek-v4-pro；不涉及当前会话模型。后续汇报必须明确变更对象。

### Suggested Action
涉及模型修改时，先核对目标范围（session / cron job / 子代理），再执行并在结果中逐项标注。

### Metadata
- Source: user_feedback
- Related Files: cron job configuration
- Tags: cron, model, scope

---
