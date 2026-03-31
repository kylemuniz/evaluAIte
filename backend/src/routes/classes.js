const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { getDatabase } = require('../services/database');

// GET /api/classes
router.get('/', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const classes = db.prepare(`
      SELECT c.*, COUNT(a.id) as assignment_count
      FROM classes c
      LEFT JOIN assignments a ON a.class_id = c.id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(req.user.id);
    res.json(classes);
  } catch (err) {
    next(err);
  }
});

// POST /api/classes
router.post('/', auth, (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const db = getDatabase();
    const id = uuidv4();
    db.prepare('INSERT INTO classes (id, user_id, name, description) VALUES (?, ?, ?, ?)').run(
      id, req.user.id, name, description || null
    );
    const created = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// GET /api/classes/:id
router.get('/:id', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const assignments = db.prepare(`
      SELECT a.*, COUNT(e.id) as essay_count
      FROM assignments a
      LEFT JOIN essays e ON e.assignment_id = a.id
      WHERE a.class_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all(cls.id);

    res.json({ ...cls, assignments });
  } catch (err) {
    next(err);
  }
});

// PUT /api/classes/:id
router.put('/:id', auth, (req, res, next) => {
  try {
    const { name, description } = req.body;
    const db = getDatabase();
    const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    db.prepare('UPDATE classes SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?').run(
      name || null, description !== undefined ? description : null, req.params.id
    );
    const updated = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/classes/:id
router.delete('/:id', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
