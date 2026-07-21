#!/usr/bin/env node

/**
 * pending-confirmations.js - 待确认状态管理 CLI
 *
 * 管理临时确认状态记录，提供创建、查询、确认前校验/锁定、完成/失败、过期扫描能力。
 * 使用 allowlist action（至少 session_cleanup_and_git_push），不得执行或保存任意 shell 命令。
 * 记录持久化到 data/pending-confirmations.json。
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'pending-confirmations.json');

// ============ 允许的动作列表 ============
const ALLOWLIST_ACTIONS = ['session_cleanup_and_git_push'];

// ============ 数据读写 ============

function readAll() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2) + '\n', 'utf-8');
}

function nextId(records) {
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => r.id)) + 1;
}

// ============ 子命令 ============

/**
 * 创建待确认记录
 * Usage: pending-confirmations.js create <action> [--ttl-minutes <n>]
 */
function cmdCreate(args) {
  if (args.length < 1) {
    console.error('Usage: pending-confirmations.js create <action> [--ttl-minutes <n>]');
    process.exit(1);
  }
  const action = args[0];
  if (!ALLOWLIST_ACTIONS.includes(action)) {
    console.error(`Error: action "${action}" is not in allowlist. Allowed: ${ALLOWLIST_ACTIONS.join(', ')}`);
    process.exit(1);
  }

  const ttlIdx = args.indexOf('--ttl-minutes');
  let ttlMinutes = 30;
  if (ttlIdx !== -1 && args[ttlIdx + 1]) {
    ttlMinutes = parseInt(args[ttlIdx + 1], 10);
    if (isNaN(ttlMinutes) || ttlMinutes < 0) {
      console.error('Error: --ttl-minutes must be a positive integer');
      process.exit(1);
    }
  }

  const records = readAll();
  const now = new Date();
  const record = {
    id: nextId(records),
    action,
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttlMinutes * 60000).toISOString(),
    updated_at: now.toISOString(),
  };
  records.push(record);
  writeAll(records);
  console.log(JSON.stringify(record, null, 2));
}

/**
 * 查询待确认记录
 * Usage: pending-confirmations.js list [--status <status>] [--id <id>]
 */
function cmdList(args) {
  let records = readAll();

  const statusIdx = args.indexOf('--status');
  if (statusIdx !== -1 && args[statusIdx + 1]) {
    records = records.filter(r => r.status === args[statusIdx + 1]);
  }

  const idIdx = args.indexOf('--id');
  if (idIdx !== -1 && args[idIdx + 1]) {
    const id = parseInt(args[idIdx + 1], 10);
    records = records.filter(r => r.id === id);
  }

  console.log(JSON.stringify(records, null, 2));
}

/**
 * 确认前校验并锁定为 executing
 * Usage: pending-confirmations.js confirm <id>
 */
function cmdConfirm(args) {
  if (args.length < 1) {
    console.error('Usage: pending-confirmations.js confirm <id>');
    process.exit(1);
  }
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error('Error: <id> must be a number');
    process.exit(1);
  }

  const records = readAll();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) {
    console.error(`Error: confirmation ${id} not found`);
    process.exit(1);
  }

  const rec = records[idx];

  // 检查是否已过期
  if (new Date(rec.expires_at) <= new Date()) {
    console.error(`Error: confirmation ${id} has expired at ${rec.expires_at}`);
    process.exit(1);
  }

  // 检查状态是否可确认
  if (rec.status !== 'pending') {
    console.error(`Error: confirmation ${id} is in status "${rec.status}", expected "pending"`);
    process.exit(1);
  }

  // 锁定为 executing
  rec.status = 'executing';
  rec.updated_at = new Date().toISOString();
  writeAll(records);
  console.log(JSON.stringify(rec, null, 2));
}

/**
 * 标记为完成
 * Usage: pending-confirmations.js complete <id>
 */
function cmdComplete(args) {
  if (args.length < 1) {
    console.error('Usage: pending-confirmations.js complete <id>');
    process.exit(1);
  }
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error('Error: <id> must be a number');
    process.exit(1);
  }

  const records = readAll();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) {
    console.error(`Error: confirmation ${id} not found`);
    process.exit(1);
  }

  const rec = records[idx];
  if (rec.status !== 'executing') {
    console.error(`Error: confirmation ${id} is in status "${rec.status}", expected "executing"`);
    process.exit(1);
  }

  rec.status = 'completed';
  rec.updated_at = new Date().toISOString();
  writeAll(records);
  console.log(JSON.stringify(rec, null, 2));
}

/**
 * 标记为失败
 * Usage: pending-confirmations.js fail <id>
 */
function cmdFail(args) {
  if (args.length < 1) {
    console.error('Usage: pending-confirmations.js fail <id>');
    process.exit(1);
  }
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error('Error: <id> must be a number');
    process.exit(1);
  }

  const records = readAll();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) {
    console.error(`Error: confirmation ${id} not found`);
    process.exit(1);
  }

  const rec = records[idx];
  if (rec.status !== 'executing') {
    console.error(`Error: confirmation ${id} is in status "${rec.status}", expected "executing"`);
    process.exit(1);
  }

  rec.status = 'failed';
  rec.updated_at = new Date().toISOString();
  writeAll(records);
  console.log(JSON.stringify(rec, null, 2));
}

/**
 * 过期扫描 - 将已过期的 pending 记录标记为 expired
 * Usage: pending-confirmations.js expire-scan
 */
function cmdExpireScan() {
  const records = readAll();
  const now = new Date();
  let expired = 0;

  for (const rec of records) {
    if (rec.status === 'pending' && new Date(rec.expires_at) < now) {
      rec.status = 'expired';
      rec.updated_at = now.toISOString();
      expired++;
    }
  }

  writeAll(records);
  console.log(JSON.stringify({ expired_count: expired }, null, 2));
}

// ============ 入口 ============

function printHelp() {
  console.log(`
pending-confirmations.js - 待确认状态管理 CLI

USAGE:
  pending-confirmations.js <command> [options]

COMMANDS:
  create <action> [--ttl-minutes <n>]   创建待确认记录
    action 必须为 allowlist 中的动作
    --ttl-minutes  过期时间（分钟），默认 30

  list [--status <s>] [--id <id>]       查询待确认记录
    --status  按状态过滤（pending/executing/completed/failed/expired）
    --id      按 ID 过滤

  confirm <id>                           确认前校验并锁定为 executing
   校验：记录存在、未过期、状态为 pending

  complete <id>                          标记为完成（需状态为 executing）

  fail <id>                              标记为失败（需状态为 executing）

  expire-scan                            扫描并标记过期记录

ALLOWLIST ACTIONS:
  ${ALLOWLIST_ACTIONS.join(', ')}

NOTE: 此工具仅管理确认状态记录，不得执行或保存任意 shell 命令。
`.trim());
}

const cmd = process.argv[2];

switch (cmd) {
  case 'create':
    cmdCreate(process.argv.slice(3));
    break;
  case 'list':
    cmdList(process.argv.slice(3));
    break;
  case 'confirm':
    cmdConfirm(process.argv.slice(3));
    break;
  case 'complete':
    cmdComplete(process.argv.slice(3));
    break;
  case 'fail':
    cmdFail(process.argv.slice(3));
    break;
  case 'expire-scan':
    cmdExpireScan();
    break;
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
}
