const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'data', 'ledger.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

// ── Queries ──────────────────────────────────────

function addTransaction({ type, amount, category, account, description, date }) {
  const db = getDb();
  // Validate category
  const cat = db.prepare('SELECT name FROM categories WHERE name = ? AND type = ?').get(category, type);
  if (!cat) throw new Error(`分类 "${category}" 不存在于 ${type} 列表中`);

  // Validate account if provided
  if (account) {
    const acct = db.prepare('SELECT name FROM accounts WHERE name = ?').get(account);
    if (!acct) throw new Error(`账户 "${account}" 不存在`);
  }

  const result = db.prepare(
    'INSERT INTO transactions (type, amount, category, account, description, trans_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(type, amount, category, account || 'default', description || '', date);
  db.close();
  return result;
}

function getSummary(period) {
  const db = getDb();
  let dateFilter = '';
  const params = [];

  const now = new Date();
  if (period === 'today') {
    dateFilter = "AND trans_date = date('now','localtime')";
  } else if (period === 'yesterday') {
    dateFilter = "AND trans_date = date('now','localtime','-1 day')";
  } else if (period === 'this_week') {
    dateFilter = "AND trans_date >= date('now','localtime','weekday 0','-6 days')";
  } else if (period === 'this_month') {
    dateFilter = "AND strftime('%Y-%m', trans_date) = strftime('%Y-%m', 'now','localtime')";
  } else if (period === 'last_month') {
    dateFilter = "AND strftime('%Y-%m', trans_date) = strftime('%Y-%m', 'now','localtime','-1 month')";
  }

  const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM transactions WHERE type='income' ${dateFilter}`).get(...params);
  const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM transactions WHERE type='expense' ${dateFilter}`).get(...params);

  // By category
  const byCategory = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE type='expense' ${dateFilter} GROUP BY category ORDER BY total DESC`).all(...params);

  db.close();
  return { income, expense, byCategory };
}

function getTransactions(period) {
  const db = getDb();
  let dateFilter = '';
  if (period === 'today') {
    dateFilter = "WHERE trans_date = date('now','localtime')";
  } else if (period === 'this_week') {
    dateFilter = "WHERE trans_date >= date('now','localtime','weekday 0','-6 days')";
  } else if (period === 'this_month') {
    dateFilter = "WHERE strftime('%Y-%m', trans_date) = strftime('%Y-%m', 'now','localtime')";
  }

  const rows = db.prepare(`SELECT * FROM transactions ${dateFilter} ORDER BY trans_date DESC, id DESC`).all();
  db.close();
  return rows;
}

function listAccounts() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM accounts ORDER BY id').all();
  db.close();
  return rows;
}

function listCategories(type) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY id').all(type || '%');
  db.close();
  return rows;
}

// Handle CLI
const [cmd, ...args] = process.argv.slice(2);

try {
  switch (cmd) {
    case 'add': {
      const [type, amount, category] = args;
      const accountIdx = type === 'expense' ? 3 : 3;
      const descIdx    = type === 'expense' ? 4 : 4;
      const dateIdx    = type === 'expense' ? 5 : 5;
      // Simpler: use named args via JSON
      const payload = JSON.parse(args.join(' '));
      const result = addTransaction(payload);
      console.log(JSON.stringify({ ok: true, id: result.lastInsertRowid }));
      break;
    }
    case 'summary': {
      const period = args[0] || 'this_month';
      const data = getSummary(period);
      console.log(JSON.stringify(data));
      break;
    }
    case 'list': {
      const period = args[0] || 'this_month';
      const data = getTransactions(period);
      console.log(JSON.stringify(data));
      break;
    }
    case 'accounts': {
      console.log(JSON.stringify(listAccounts()));
      break;
    }
    case 'categories': {
      console.log(JSON.stringify(listCategories(args[0])));
      break;
    }
    default:
      console.log(JSON.stringify({ error: `Unknown command: ${cmd}` }));
  }
} catch (e) {
  console.log(JSON.stringify({ error: e.message }));
}
