const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ADMIN_PW = process.env.ADMIN_PASSWORD || 'nyp2025';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getData() {
  return {
    notices: db.prepare('SELECT * FROM notices ORDER BY date_key').all(),
    matchings: db.prepare('SELECT * FROM matchings ORDER BY date_key, meal, id').all(),
    hosts: db.prepare('SELECT * FROM hosts ORDER BY gender, name').all(),
    day_notes: db.prepare('SELECT * FROM day_notes').all(),
  };
}

function broadcast() {
  io.emit('data_update', getData());
}

function checkPw(req, res) {
  const pw = req.body?.password || req.query?.password;
  if (pw !== ADMIN_PW) {
    res.status(401).json({ error: '비밀번호가 틀렸습니다' });
    return false;
  }
  return true;
}

// 공개 API
app.get('/api/data', (req, res) => res.json(getData()));

// 관리자 인증
app.post('/api/admin/auth', (req, res) => {
  if (req.body.password === ADMIN_PW) res.json({ ok: true });
  else res.status(401).json({ ok: false, error: '비밀번호가 틀렸습니다' });
});

// 공지 업데이트
app.put('/api/admin/notice/:id', (req, res) => {
  if (!checkPw(req, res)) return;
  const { resolved, resolved_text } = req.body;
  db.prepare('UPDATE notices SET resolved=?, resolved_text=? WHERE id=?')
    .run(resolved ? 1 : 0, resolved_text || null, req.params.id);
  broadcast();
  res.json({ ok: true });
});

// 한국 교제자 추가
app.post('/api/admin/host', (req, res) => {
  if (!checkPw(req, res)) return;
  const { name, gender, note } = req.body;
  if (!name || !gender) return res.status(400).json({ error: '이름과 성별은 필수입니다' });
  const r = db.prepare('INSERT INTO hosts (name, gender, note) VALUES (?,?,?)').run(name, gender, note || null);
  broadcast();
  res.json({ ok: true, id: r.lastInsertRowid });
});

// 한국 교제자 삭제
app.delete('/api/admin/host/:id', (req, res) => {
  if (!checkPw(req, res)) return;
  db.prepare('DELETE FROM hosts WHERE id=?').run(req.params.id);
  broadcast();
  res.json({ ok: true });
});

// 매칭 추가
app.post('/api/admin/matching', (req, res) => {
  if (!checkPw(req, res)) return;
  const { date_key, meal, nyp_name, host_name, note } = req.body;
  if (!date_key || !meal || !nyp_name || !host_name) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다' });
  }
  const r = db.prepare(
    'INSERT INTO matchings (date_key, meal, nyp_name, host_name, note, created_at) VALUES (?,?,?,?,?,?)'
  ).run(date_key, meal, nyp_name, host_name, note || null, new Date().toISOString());
  broadcast();
  res.json({ ok: true, id: r.lastInsertRowid });
});

// 매칭 삭제
app.delete('/api/admin/matching/:id', (req, res) => {
  if (!checkPw(req, res)) return;
  db.prepare('DELETE FROM matchings WHERE id=?').run(req.params.id);
  broadcast();
  res.json({ ok: true });
});

// 일정 메모 (날짜별 추가 메모)
app.put('/api/admin/day-note', (req, res) => {
  if (!checkPw(req, res)) return;
  const { date_key, note } = req.body;
  db.prepare('INSERT OR REPLACE INTO day_notes (date_key, note, updated_at) VALUES (?,?,?)')
    .run(date_key, note, new Date().toISOString());
  broadcast();
  res.json({ ok: true });
});

io.on('connection', socket => {
  console.log('접속:', socket.id);
  socket.emit('data_update', getData());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin.html`);
  console.log(`관리자 비밀번호: ${ADMIN_PW}`);
});
