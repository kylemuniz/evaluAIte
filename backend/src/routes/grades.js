const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
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

function computeLetterGrade(grade) {
  if (grade >= 93) return 'A';
  if (grade >= 90) return 'A-';
  if (grade >= 87) return 'B+';
  if (grade >= 83) return 'B';
  if (grade >= 80) return 'B-';
  if (grade >= 77) return 'C+';
  if (grade >= 73) return 'C';
  if (grade >= 70) return 'C-';
  if (grade >= 67) return 'D+';
  if (grade >= 60) return 'D';
  return 'F';
}

// POST /api/essays/:id/grade  — teacher manual grade
router.post('/:id/grade', auth, (req, res, next) => {
  try {
    const { grade, feedback_likes, feedback_improvements, rubric_scores } = req.body;
    if (grade == null) return res.status(400).json({ error: 'grade is required' });

    const numGrade = Number(grade);
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 100) {
      return res.status(400).json({ error: 'grade must be a number between 0 and 100' });
    }

    const db = getDatabase();
    const essay = getEssayForTeacher(db, req.params.id, req.user.id);
    if (!essay) return res.status(404).json({ error: 'Essay not found' });

    const letter_grade = computeLetterGrade(numGrade);
    const rubricJson = rubric_scores ? JSON.stringify(rubric_scores) : null;

    const existing = db.prepare('SELECT id, grade FROM grades WHERE essay_id = ?').get(essay.id);
    if (existing) {
      db.prepare(`
        UPDATE grades SET grader_type='teacher', grade=?, letter_grade=?, feedback_likes=?,
        feedback_improvements=?, rubric_scores=?, confidence_score=NULL, ai_reasoning=NULL,
        created_at=datetime('now') WHERE essay_id=?
      `).run(numGrade, letter_grade, feedback_likes || null, feedback_improvements || null, rubricJson, essay.id);

      db.prepare(`
        INSERT INTO review_history (id, essay_id, action, old_value, new_value)
        VALUES (?, ?, 'manual_grade_update', ?, ?)
      `).run(uuidv4(), essay.id, JSON.stringify({ grade: existing.grade }), JSON.stringify({ grade: numGrade }));
    } else {
      db.prepare(`
        INSERT INTO grades (id, essay_id, grader_type, grade, letter_grade, feedback_likes, feedback_improvements, rubric_scores)
        VALUES (?, ?, 'teacher', ?, ?, ?, ?, ?)
      `).run(uuidv4(), essay.id, numGrade, letter_grade, feedback_likes || null, feedback_improvements || null, rubricJson);

      db.prepare(`
        INSERT INTO review_history (id, essay_id, action, new_value) VALUES (?, ?, 'manual_grade', ?)
      `).run(uuidv4(), essay.id, JSON.stringify({ grade: numGrade }));
    }

    db.prepare("UPDATE essays SET status = 'manually_graded' WHERE id = ?").run(essay.id);

    const updatedGrade = db.prepare('SELECT * FROM grades WHERE essay_id = ?').get(essay.id);
    res.json({
      ...updatedGrade,
      rubric_scores: updatedGrade.rubric_scores ? JSON.parse(updatedGrade.rubric_scores) : null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/essays/:id/review  — teacher reviews (and optionally edits) AI grade
router.put('/:id/review', auth, (req, res, next) => {
  try {
    const { grade, feedback_likes, feedback_improvements, rubric_scores } = req.body;

    const db = getDatabase();
    const essay = getEssayForTeacher(db, req.params.id, req.user.id);
    if (!essay) return res.status(404).json({ error: 'Essay not found' });

    if (!['ai_graded', 'reviewed'].includes(essay.status)) {
      return res.status(422).json({ error: 'Essay must be AI-graded before it can be reviewed' });
    }

    const existing = db.prepare('SELECT * FROM grades WHERE essay_id = ?').get(essay.id);
    if (!existing) return res.status(404).json({ error: 'No grade found for this essay' });

    const numGrade = grade != null ? Number(grade) : existing.grade;
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 100) {
      return res.status(400).json({ error: 'grade must be a number between 0 and 100' });
    }

    const letter_grade = computeLetterGrade(numGrade);
    const rubricJson = rubric_scores ? JSON.stringify(rubric_scores) : existing.rubric_scores;
    const newLikes = feedback_likes !== undefined ? feedback_likes : existing.feedback_likes;
    const newImprovements = feedback_improvements !== undefined ? feedback_improvements : existing.feedback_improvements;

    db.prepare(`
      UPDATE grades SET grade=?, letter_grade=?, feedback_likes=?, feedback_improvements=?,
      rubric_scores=?, created_at=datetime('now') WHERE essay_id=?
    `).run(numGrade, letter_grade, newLikes, newImprovements, rubricJson, essay.id);

    db.prepare(`
      INSERT INTO review_history (id, essay_id, action, old_value, new_value)
      VALUES (?, ?, 'teacher_review', ?, ?)
    `).run(
      uuidv4(), essay.id,
      JSON.stringify({ grade: existing.grade }),
      JSON.stringify({ grade: numGrade, reviewed: true })
    );

    db.prepare("UPDATE essays SET status = 'reviewed' WHERE id = ?").run(essay.id);

    const updatedGrade = db.prepare('SELECT * FROM grades WHERE essay_id = ?').get(essay.id);
    res.json({
      ...updatedGrade,
      rubric_scores: updatedGrade.rubric_scores ? JSON.parse(updatedGrade.rubric_scores) : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
