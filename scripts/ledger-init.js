const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'data', 'ledger.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount      REAL NOT NULL,
    category    TEXT NOT NULL,
    account     TEXT NOT NULL DEFAULT 'default',
    description TEXT DEFAULT '',
    trans_date  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL CHECK(type IN ('credit_card','debit_card','savings','cash','other')),
    is_default  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL CHECK(type IN ('income','expense'))
  );

  CREATE TABLE IF NOT EXISTS monthly_budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month  TEXT NOT NULL UNIQUE,
    amount      REAL NOT NULL,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Seed accounts
const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts (name, type, is_default) VALUES (?, ?, ?)');
insertAccount.run('8429信用卡', 'credit_card', 0);
insertAccount.run('1628储蓄卡', 'debit_card', 0);
insertAccount.run('2018工资卡', 'savings', 0);

// Seed categories
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)');
const expenseCats = ['餐饮','交通','购物','住房','娱乐','医疗','数码','日用','装修','其他'];
const incomeCats  = ['工资','投资','报销','兼职','其他'];
expenseCats.forEach(c => insertCat.run(c, 'expense'));
incomeCats.forEach(c => insertCat.run(c, 'income'));

// Verify
console.log('Accounts:');
console.log(db.prepare('SELECT * FROM accounts').all());
console.log('\nCategories:');
console.log(db.prepare('SELECT * FROM categories').all());

db.close();
console.log('\n✅ 数据库初始化完成:', DB_PATH);
