# MEMORY.md — 长期记忆

## 对话偏好
- 2026-06-14: 顾涛要求后续对话使用中文
- 2026-06-14: 收到指令前应优先检查是否有可用的 skill 来完成，无可用 skill 再按默认策略执行

## 总结风格
- 2026-06-14: 顾涛要求对文章/内容的总结遵循"详尽 + 思考性结论"格式：覆盖所有核心要点、关键数据和引用，按主题分节，结尾附思考性结论/启示。不做极简摘要。

## 安全规则
- 2026-06-14: 安装任何 skill 前，必须先按 skill-vetter 协议完成安全审查，审查通过后方可安装

## 记账规范
- 2026-06-28: 记账统一走 SQLite `scripts/ledger.js add`（JSON 入参），写入 `data/ledger.db`。
  memory/ 日记文件仅作摘要参考，不作为主要记账入口。
- 新增示例：
  `node scripts/ledger.js add '{"type":"expense","amount":50,"category":"餐饮","account":"8429信用卡","description":"午饭","date":"2026-07-05"}'`
- 账户/分类以数据库为准，记账前用 `node scripts/ledger.js accounts`、
  `node scripts/ledger.js categories [expense|income]` 查询；分类不存在会被拒绝，勿凭记忆臆造。
- 汇总：`node scripts/ledger.js summary this_month`（也支持 today/yesterday/this_week/last_month）。
