const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDatabase } = require('../services/database');

// Helper: verify essay belongs to authenticated teacher
function getEssayForTeacher(db, essayId, userId) {
  return db.prepare(`
    SELECT e.* FROM essays e
    JOIN assignments a ON a.id = e.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE e.id = ? AND c.user_id = ?
  `).get(essayId, userId);
}

// GET /api/essays/:id
router.get('/:id', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const essay = getEssayForTeacher(db, req.params.id, req.user.id);
    if (!essay) return res.status(404).json({ error: 'Essay not found' });

    const grade = db.prepare('SELECT * FROM grades WHERE essay_id = ?').get(essay.id);
    const history = db.prepare('SELECT * FROM review_history WHERE essay_id = ? ORDER BY created_at DESC').all(essay.id);

    res.json({
      ...essay,
      grade: grade ? { ...grade, rubric_scores: grade.rubric_scores ? JSON.parse(grade.rubric_scores) : null } : null,
      review_history: history,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
