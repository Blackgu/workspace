# Heartbeat 巡检清单

## 资讯日报完整性检查
- 在 08:00-09:00 时段内执行此项检查
- 检查 memory/ 目录下今天的日报文件 memory/YYYY-MM-DD-report-briefing.md 是否存在
- 如果文件不存在：发送告警「⚠️ 今日资讯日报未生成，请检查 Cron 任务状态」
- 如果文件存在但缺少「✅二轮采集完成」标记：发送提醒「资讯日报第二轮采集尚未完成」
- 如果文件存在且包含「✅二轮采集完成」：一切正常，回复 HEARTBEAT_OK

## 每日对话记忆归档检查
- **每次心跳都触发，但距上次归档超过 4 小时才执行实际检查**
- ⚠️ **心跳在隔离 session 中运行，必须通过工具读取主 session 对话内容**
  - 使用 `sessions_history(sessionKey: "main", limit: 30)` 获取主会话最近对话
  - 使用 `sessions_list` 确认主 session 的 key（通常为包含 "main" 和 "openclaw-weixin" 的 session）
  - 如果 `sessions_history` 返回空或无法读取：说明心跳隔离 session 缺少工具权限，跳过并回复 HEARTBEAT_OK
- 判断方法：检查 memory/ 目录下今天的日志文件 memory/YYYY-MM-DD.md 的最后修改时间
  - 如果距上次修改不足 4 小时：跳过，回复 HEARTBEAT_OK
  - 如果距上次修改超过 4 小时或文件不存在：执行以下检查:
    - 检查 memory/ 目录下今天的日志文件 memory/YYYY-MM-DD.md 是否存在（注意：不是 briefing 文件）
    - 如果今天有过对话但日志文件不存在：
      1. 通过 sessions_history 回顾今天的对话要点（关键决策、学到的信息、待办事项）
      2. 创建 memory/YYYY-MM-DD.md 文件并写入要点
      3. 静默完成，回复 HEARTBEAT_OK（不调用 sessions_send 推送通知）
    - 如果今天没有对话记录：回复 HEARTBEAT_OK
    - 如果日志文件已存在：检查最近4小时是否有内容要追加
      1. 决策、规则变更、技术方案、任务结论等必须追加
      2. 闲聊、重复讨论、无明确结论的内容跳过
      3. 追加完成后静默结束，回复 HEARTBEAT_OK
    - 记录格式：二级标题分类，每条要点用「-HH:MM +人物 +核心内容」
      1. 每条日志条目必须以 HH:MM（24小时制，如 08:00、14:30）开头
      2. 无法确定具体时间的，使用大致时间段（如 上午、下午 等）替代

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
- 执行完成，发送通知「✅已完成今日会话清理 & 文件push」到微信主会话
- 清理完成后，在 memory/last-session-cleanup.txt 中写入今天的日期

## 默认行为
- 以上检查项在对应时段外或均无异常时，回复 HEARTBEAT_OK
- 不要发送无意义的「一切正常」消息
