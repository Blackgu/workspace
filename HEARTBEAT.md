# Heartbeat 巡检清单

## 强制执行顺序
- 多项巡检同时到期时，必须按以下顺序串行完成：**1. 每日记忆归档兜底检查 → 2. 资讯日报检查 → 3. 每日会话清理**。
- 每日记忆归档由独立 cron 作为主任务；heartbeat 仅检查是否漏归档，必要时才补救。
- 会话清理的确认、无可清理会话、Git 状态或任何其他任务，**不得**中断或跳过已到期的归档兜底检查。
- 在全部到期检查完成前，禁止回复 `HEARTBEAT_OK`。

## 资讯日报完整性检查
- 在 08:00-09:00 时段内执行此项检查
- 检查 memory/ 目录下今天的日报文件 memory/YYYY-MM-DD-report-briefing.md 是否存在
- 如果文件不存在：遵循发送通知规范，发送告警「⚠️ 今日资讯日报未生成，请检查 Cron 任务状态」
- 如果文件存在但缺少「✅二轮采集完成」标记：遵循发送通知规范，发送提醒「资讯日报第二轮采集尚未完成」
- 如果文件存在且包含「✅二轮采集完成」：一切正常，回复 HEARTBEAT_OK

## 每日记忆归档兜底检查
- **主任务为「每日记忆归档 cron」**（每4小时运行）；heartbeat 不执行常规归档。
- 仅在以下情况执行补救：当天日志 `memory/YYYY-MM-DD.md` 不存在，或其最后修改时间距今超过 **6小时**。
- 触发补救时：
  1. 用 `sessions_list(agentId: "main", search: "openclaw-weixin")` 定位当前微信主会话（如参数必填，`label` 仅传单个空格）。
  2. 仅选择 `deliveryContext.accountId` 为 `b7256e252baa-im-bot`、且 `deliveryContext.to` 为 `o9cq80w9dtbrD6fURdBIJd188imE@im.wechat` 的完整 key，记为 `wechatMainSessionKey`。
  3. 用 `sessions_history(sessionKey: wechatMainSessionKey, limit: 100)` 回顾当天对话；若无当天对话则不写入、不通知。
  4. 有有效增量时，按“二级标题 + `-HH:MM 人物：核心内容`”格式创建或追加当天日志，仅记录决策、规则变更、技术方案、任务结论、待办、已确认故障根因/修复；跳过闲聊、重复和无结论内容。
  5. 成功创建或追加后，遵循发送通知规范发送「📝 已自动归档今日对话要点」。
- 未达到补救条件或无有效增量时，静默继续其他到期检查。

## 每日会话清理 & 人格文件push
- 在 21:30-22:00 时段内每次心跳都触发，但每天只执行一次
- 判断方法：检查 memory/ 目录下是否存在 `last-session-cleanup.txt` 文件，读取其中记录的日期
  - 如果记录日期与今天相同：说明今天已执行，跳过，回复 HEARTBEAT_OK
  - 如果记录日期不是今天或文件不存在：执行以下检查
- 检查 openclaw 的会话列表（活跃/非活跃）
- 执行：
  1. **主会话（微信）** 必须保留
  2. cron 隔离会话，不清理
  3. codex 子会话，且已经是正常完成状态，执行清理
  4. 僵尸会话，执行清理
- 清理完成后，执行 git 提交推送：
  1. `cd /home/ecs-user/.openclaw/workspace`
  2. `git add .`
  3. `git commit -m "[heartbeat] 每日会话清理 & 文件同步 $(date '+%Y-%m-%d')"`
  4. `git push`
- 执行完成后，遵循发送通知规范，发送通知「✅已完成今日会话清理 & 文件push」
- 清理完成后，在 memory/last-session-cleanup.txt 中写入今天的日期

## 发送通知规范
使用已定位的 `wechatMainSessionKey` 调用 `sessions_send`。调用参数必须遵循以下形式：
- `sessionKey: wechatMainSessionKey`
- `agentId: "main"`
- `label: " "`（**单个空格**，仅用于满足工具参数格式；不得填写任何真实 label）

这表示路由只依赖完整的 `sessionKey`，避免 `sessionKey` 与实际 label 同时存在而被工具拒绝。不得重新以 `label: "main"` 搜索或投递。

投递以下指令：
```text
【heartbeat 完成通知】请直接以最终可见回复向顾涛发送且只发送以下内容：
${通知内容}
不要调用工具、不要解释、不要返回空内容。
```
`sessions_send` 仅负责将指令送达微信主会话；必须由该会话的最终可见回复完成微信投递。若 `sessions_send` 返回错误，输出简短告警说明投递失败原因，不能将其视为已通知。

## 默认行为
- 以上检查项在对应时段外或均无异常时，回复 HEARTBEAT_OK
- 不要发送无意义的「一切正常」消息
