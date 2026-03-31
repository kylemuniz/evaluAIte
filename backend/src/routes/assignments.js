const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const { getDatabase } = require('../services/database');
const { parseFile } = require('../services/fileParser');
const { gradeEssayWithAI } = require('../services/aiService');

// Multer storage config
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.docx', '.odt', '.txt', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}`));
  },
});

// Helper: verify assignment belongs to the authenticated teacher
function getAssignmentForTeacher(db, assignmentId, userId) {
  return db.prepare(`
    SELECT a.* FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = ? AND c.user_id = ?
  `).get(assignmentId, userId);
}

// GET /api/assignments/:id
router.get('/:id', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const rubric = db.prepare('SELECT * FROM rubric_categories WHERE assignment_id = ? ORDER BY order_index').all(assignment.id);
    const guidance = db.prepare('SELECT * FROM teacher_guidance WHERE assignment_id = ?').get(assignment.id);

    res.json({ ...assignment, rubric_categories: rubric, teacher_guidance: guidance || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments
router.post('/', auth, (req, res, next) => {
  try {
    const { class_id, title, description } = req.body;
    if (!class_id || !title) return res.status(400).json({ error: 'class_id and title are required' });

    const db = getDatabase();
    const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND user_id = ?').get(class_id, req.user.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const id = uuidv4();
    db.prepare('INSERT INTO assignments (id, class_id, title, description) VALUES (?, ?, ?, ?)').run(
      id, class_id, title, description || null
    );
    const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/assignments/:id
router.put('/:id', auth, (req, res, next) => {
  try {
    const { title, description, status } = req.body;
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const validStatuses = ['draft', 'active', 'finalized'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    db.prepare(`
      UPDATE assignments SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(title || null, description !== undefined ? description : null, status || null, req.params.id);

    const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/rubric
router.post('/:id/rubric', auth, (req, res, next) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'categories must be an array' });

    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const saveRubric = db.transaction(() => {
      db.prepare('DELETE FROM rubric_categories WHERE assignment_id = ?').run(req.params.id);
      for (let i = 0; i < categories.length; i++) {
        const { name, description, max_points } = categories[i];
        if (!name || max_points == null) throw new Error('Each category requires name and max_points');
        db.prepare(`
          INSERT INTO rubric_categories (id, assignment_id, name, description, max_points, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), req.params.id, name, description || null, Number(max_points), i);
      }
    });
    saveRubric();

    const saved = db.prepare('SELECT * FROM rubric_categories WHERE assignment_id = ? ORDER BY order_index').all(req.params.id);
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/guidance
router.post('/:id/guidance', auth, (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const existing = db.prepare('SELECT id FROM teacher_guidance WHERE assignment_id = ?').get(req.params.id);
    if (existing) {
      db.prepare('UPDATE teacher_guidance SET content = ? WHERE assignment_id = ?').run(content, req.params.id);
    } else {
      db.prepare('INSERT INTO teacher_guidance (id, assignment_id, content) VALUES (?, ?, ?)').run(
        uuidv4(), req.params.id, content
      );
    }

    const saved = db.prepare('SELECT * FROM teacher_guidance WHERE assignment_id = ?').get(req.params.id);
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/essays  (file upload)
router.post('/:id/essays', auth, upload.array('files', 50), async (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const currentMax = db.prepare('SELECT MAX(upload_order) as max_order FROM essays WHERE assignment_id = ?').get(req.params.id);
    let orderCounter = (currentMax.max_order || 0) + 1;

    const results = [];
    for (const file of req.files) {
      let essayText;
      try {
        essayText = await parseFile(file.path, file.originalname);
      } catch (parseErr) {
        essayText = `[Could not parse file: ${parseErr.message}]`;
      }

      // Use student_name from request body when provided; otherwise fall back to the
      // filename stem (spaces substituted for dashes/underscores). Callers should
      // pass student_name explicitly for accurate attribution.
      const studentName = (req.body.student_name || '').trim() ||
        path.basename(file.originalname, path.extname(file.originalname)).replace(/[-_]/g, ' ');

      const essayId = uuidv4();
      db.prepare(`
        INSERT INTO essays (id, assignment_id, student_name, file_name, essay_text, upload_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(essayId, req.params.id, studentName, file.filename, essayText, orderCounter++);

      results.push(db.prepare('SELECT * FROM essays WHERE id = ?').get(essayId));
    }

    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/assignments/:id/essays
router.get('/:id/essays', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const essays = db.prepare(`
      SELECT e.*, g.grader_type, g.grade, g.letter_grade, g.feedback_likes,
             g.feedback_improvements, g.rubric_scores, g.confidence_score, g.ai_reasoning
      FROM essays e
      LEFT JOIN grades g ON g.essay_id = e.id
      WHERE e.assignment_id = ?
      ORDER BY e.upload_order ASC
    `).all(req.params.id);

    const parsed = essays.map(e => ({
      ...e,
      rubric_scores: e.rubric_scores ? JSON.parse(e.rubric_scores) : null,
    }));

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/ai-grade
router.post('/:id/ai-grade', auth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Enforce: at least 3 manually graded essays required
    const manualCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM essays WHERE assignment_id = ? AND status = 'manually_graded'
    `).get(req.params.id);

    if (manualCount.cnt < 3) {
      return res.status(422).json({
        error: 'At least 3 essays must be manually graded before AI grading can be triggered',
        manually_graded: manualCount.cnt,
        required: 3,
      });
    }

    const ungradedEssays = db.prepare(`
      SELECT * FROM essays WHERE assignment_id = ? AND status = 'uploaded'
      ORDER BY upload_order ASC
    `).all(req.params.id);

    if (ungradedEssays.length === 0) {
      return res.json({ message: 'No ungraded essays found', graded: 0 });
    }

    const rubric = db.prepare('SELECT * FROM rubric_categories WHERE assignment_id = ? ORDER BY order_index').all(req.params.id);
    const guidance = db.prepare('SELECT content FROM teacher_guidance WHERE assignment_id = ?').get(req.params.id);
    const exampleGrades = db.prepare(`
      SELECT e.essay_text, e.student_name, g.grade, g.letter_grade, g.feedback_likes,
             g.feedback_improvements, g.rubric_scores
      FROM essays e
      JOIN grades g ON g.essay_id = e.id
      WHERE e.assignment_id = ? AND g.grader_type = 'teacher'
      ORDER BY e.upload_order ASC
      LIMIT 3
    `).all(req.params.id);

    const gradedResults = [];

    for (const essay of ungradedEssays) {
      const result = await gradeEssayWithAI({
        essay,
        rubric,
        guidance: guidance ? guidance.content : '',
        examples: exampleGrades.map(ex => ({
          ...ex,
          rubric_scores: ex.rubric_scores ? JSON.parse(ex.rubric_scores) : null,
        })),
      });

      // Upsert grade
      const existingGrade = db.prepare('SELECT id FROM grades WHERE essay_id = ?').get(essay.id);
      if (existingGrade) {
        db.prepare(`
          UPDATE grades SET grader_type='ai', grade=?, letter_grade=?, feedback_likes=?,
          feedback_improvements=?, rubric_scores=?, confidence_score=?, ai_reasoning=?,
          created_at=datetime('now') WHERE essay_id=?
        `).run(
          result.grade, result.letter_grade, result.feedback_likes, result.feedback_improvements,
          JSON.stringify(result.rubric_scores), result.confidence_score, result.ai_reasoning, essay.id
        );
      } else {
        db.prepare(`
          INSERT INTO grades (id, essay_id, grader_type, grade, letter_grade, feedback_likes,
          feedback_improvements, rubric_scores, confidence_score, ai_reasoning)
          VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), essay.id, result.grade, result.letter_grade, result.feedback_likes,
          result.feedback_improvements, JSON.stringify(result.rubric_scores),
          result.confidence_score, result.ai_reasoning
        );
      }

      db.prepare("UPDATE essays SET status = 'ai_graded' WHERE id = ?").run(essay.id);
      db.prepare(`
        INSERT INTO review_history (id, essay_id, action, new_value) VALUES (?, ?, 'ai_grade', ?)
      `).run(uuidv4(), essay.id, JSON.stringify({ grade: result.grade }));

      gradedResults.push({ essay_id: essay.id, student_name: essay.student_name, ...result });
    }

    res.json({ message: `AI graded ${gradedResults.length} essay(s)`, graded: gradedResults.length, results: gradedResults });
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/finalize
router.post('/:id/finalize', auth, (req, res, next) => {
  try {
    const db = getDatabase();
    const assignment = getAssignmentForTeacher(db, req.params.id, req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const unreviewed = db.prepare(`
      SELECT COUNT(*) as cnt FROM essays
      WHERE assignment_id = ? AND status NOT IN ('reviewed', 'finalized', 'manually_graded')
    `).get(req.params.id);

    if (unreviewed.cnt > 0) {
      return res.status(422).json({
        error: 'All essays must be reviewed before finalizing',
        unreviewed_count: unreviewed.cnt,
      });
    }

    db.prepare("UPDATE essays SET status = 'finalized' WHERE assignment_id = ? AND status IN ('reviewed', 'manually_graded')").run(req.params.id);
    db.prepare("UPDATE assignments SET status = 'finalized' WHERE id = ?").run(req.params.id);

    const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    res.json({ message: 'Assignment finalized', assignment: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
