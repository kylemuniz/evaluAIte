const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { getDatabase } = require('../services/database');

// Helper: verify assignment belongs to teacher
function getAssignmentForTeacher(db, assignmentId, userId) {
  return db.prepare(`
    SELECT a.* FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = ? AND c.user_id = ?
  `).get(assignmentId, userId);
}

// GET /api/rubrics/:assignmentId
router.get('/:assignmentId', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.assignmentId, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const categories = db.prepare(
      'SELECT * FROM rubric_categories WHERE assignment_id = ? ORDER BY order_index'
    ).all(req.params.assignmentId);

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/rubrics/:assignmentId  — full replace
router.post('/:assignmentId', auth, (req, res, next) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'categories must be an array' });

    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.assignmentId, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const save = db.transaction(() => {
      db.prepare('DELETE FROM rubric_categories WHERE assignment_id = ?').run(req.params.assignmentId);
      for (let i = 0; i < categories.length; i++) {
        const { name, description, max_points } = categories[i];
        if (!name || max_points == null) throw new Error('Each category requires name and max_points');
        db.prepare(`
          INSERT INTO rubric_categories (id, assignment_id, name, description, max_points, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), req.params.assignmentId, name, description || null, Number(max_points), i);
      }
    });
    save();

    const saved = db.prepare(
      'SELECT * FROM rubric_categories WHERE assignment_id = ? ORDER BY order_index'
    ).all(req.params.assignmentId);

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// PUT /api/rubrics/:assignmentId/:categoryId  — update one category
router.put('/:assignmentId/:categoryId', auth, (req, res, next) => {
  try {
    const { name, description, max_points, order_index } = req.body;
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.assignmentId, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const category = db.prepare(
      'SELECT id FROM rubric_categories WHERE id = ? AND assignment_id = ?'
    ).get(req.params.categoryId, req.params.assignmentId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    db.prepare(`
      UPDATE rubric_categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        max_points = COALESCE(?, max_points),
        order_index = COALESCE(?, order_index)
      WHERE id = ?
    `).run(
      name || null,
      description !== undefined ? description : null,
      max_points != null ? Number(max_points) : null,
      order_index != null ? Number(order_index) : null,
      req.params.categoryId
    );

    const updated = db.prepare('SELECT * FROM rubric_categories WHERE id = ?').get(req.params.categoryId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rubrics/:assignmentId/:categoryId
router.delete('/:assignmentId/:categoryId', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.assignmentId, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const category = db.prepare(
      'SELECT id FROM rubric_categories WHERE id = ? AND assignment_id = ?'
    ).get(req.params.categoryId, req.params.assignmentId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    db.prepare('DELETE FROM rubric_categories WHERE id = ?').run(req.params.categoryId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
