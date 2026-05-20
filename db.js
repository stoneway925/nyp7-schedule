const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'nyp.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    date_label TEXT NOT NULL,
    label TEXT NOT NULL,
    resolved INTEGER DEFAULT 0,
    resolved_text TEXT
  );

  CREATE TABLE IF NOT EXISTS day_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT UNIQUE NOT NULL,
    note TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS matchings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    meal TEXT NOT NULL,
    nyp_name TEXT NOT NULL,
    host_name TEXT NOT NULL,
    note TEXT,
    created_at TEXT
  );
`);

// 초기 공지 항목 시딩
const count = db.prepare('SELECT COUNT(*) as c FROM notices').get().c;
if (count === 0) {
  const ins = db.prepare('INSERT INTO notices (date_key, date_label, label) VALUES (?, ?, ?)');
  [
    ['0522', '5/22 (금)', '저녁 교제 매칭'],
    ['0523', '5/23 (토)', '점심 교제 연결'],
    ['0525', '5/25 (월)', '한국외대 픽업자 확정'],
    ['0527', '5/27 (수)', '수요모임 싱가포르 간증자 선정'],
    ['0529', '5/29 (금)', '점심 캠퍼스 연결'],
  ].forEach(([a, b, c]) => ins.run(a, b, c));
}

module.exports = db;
