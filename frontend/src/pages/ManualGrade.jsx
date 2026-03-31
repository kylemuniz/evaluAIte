import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';

function getLetterGrade(score) {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

export default function ManualGrade() {
  const { assignmentId, essayId } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [allEssays, setAllEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    student_name: '',
    rubric_scores: {},
    overall_grade: '',
    letter_grade: '',
    liked_feedback: '',
    improvement_feedback: '',
  });

  useEffect(() => {
    fetchData();
  }, [essayId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [essayRes, asgRes, allRes] = await Promise.all([
        api.get(`/api/essays/${essayId}`),
        api.get(`/api/assignments/${assignmentId}`),
        api.get(`/api/assignments/${assignmentId}/essays`)
      ]);
      setEssay(essayRes.data);
      setAssignment(asgRes.data);
      const essays = allRes.data.essays || allRes.data || [];
      setAllEssays(essays.slice(0, 3));

      // Pre-fill form if existing grade
      const existing = essayRes.data.grade;
      if (existing) {
        const scores = {};
        (existing.rubric_scores || []).forEach(s => {
          scores[s.category_id || s.category_name] = s.score;
        });
        setForm({
          student_name: essayRes.data.student_name || '',
          rubric_scores: scores,
          overall_grade: existing.overall_grade || '',
          letter_grade: existing.letter_grade || '',
          liked_feedback: existing.liked_feedback || '',
          improvement_feedback: existing.improvement_feedback || '',
        });
      } else {
        setForm(f => ({ ...f, student_name: essayRes.data.student_name || '' }));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const rubricCategories = assignment?.rubric_categories || [];
  const maxTotal = rubricCategories.reduce((s, c) => s + (c.max_points || 0), 0);

  const autoCalcGrade = () => {
    const total = rubricCategories.reduce((s, c) => {
      const key = c.id || c.name;
      return s + (Number(form.rubric_scores[key]) || 0);
    }, 0);
    if (maxTotal > 0) {
      const pct = Math.round((total / maxTotal) * 100);
      setForm(f => ({ ...f, overall_grade: pct, letter_grade: getLetterGrade(pct) }));
    }
  };

  const currentIdx = allEssays.findIndex(e => String(e.id) === String(essayId));

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const rubricScores = rubricCategories.map(c => ({
        category_id: c.id,
        category_name: c.name,
        score: Number(form.rubric_scores[c.id || c.name]) || 0,
        max_points: c.max_points,
      }));
      await api.post(`/api/essays/${essayId}/grade`, {
        student_name: form.student_name,
        rubric_scores: rubricScores,
        overall_grade: Number(form.overall_grade),
        letter_grade: form.letter_grade,
        liked_feedback: form.liked_feedback,
        improvement_feedback: form.improvement_feedback,
      });

      // Navigate to next essay or back
      if (currentIdx < allEssays.length - 1) {
        const nextId = allEssays[currentIdx + 1].id;
        navigate(`/assignments/${assignmentId}/essays/${nextId}/grade`);
      } else {
        navigate(`/assignments/${assignmentId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Nav row */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/assignments/${assignmentId}`)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assignment
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Essay {currentIdx + 1} of {allEssays.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (currentIdx > 0) navigate(`/assignments/${assignmentId}/essays/${allEssays[currentIdx - 1].id}/grade`);
                }}
                disabled={currentIdx <= 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Previous
              </button>
              <button
                onClick={() => {
                  if (currentIdx < allEssays.length - 1) navigate(`/assignments/${assignmentId}/essays/${allEssays[currentIdx + 1].id}/grade`);
                }}
                disabled={currentIdx >= allEssays.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
          {/* Left: Essay text */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="font-semibold text-slate-900">Essay</h2>
              <p className="text-xs text-slate-500">{essay?.filename}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                {essay?.content || essay?.text || 'Essay content not available'}
              </p>
            </div>
          </div>

          {/* Right: Grading form */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="font-semibold text-slate-900">Grade Essay</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Student name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Name</label>
                <input
                  type="text"
                  value={form.student_name}
                  onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  placeholder="Student's name"
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Rubric scores */}
              {rubricCategories.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">Rubric Scores</label>
                    <button
                      type="button"
                      onClick={autoCalcGrade}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Auto-calculate total
                    </button>
                  </div>
                  <div className="space-y-3">
                    {rubricCategories.map(cat => {
                      const key = cat.id || cat.name;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-slate-700">{cat.name}</p>
                            {cat.description && <p className="text-xs text-slate-400">{cat.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={cat.max_points}
                              value={form.rubric_scores[key] ?? ''}
                              onChange={e => setForm(f => ({
                                ...f,
                                rubric_scores: { ...f.rubric_scores, [key]: e.target.value }
                              }))}
                              className="w-16 text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center"
                            />
                            <span className="text-xs text-slate-400">/{cat.max_points}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overall grade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Overall Grade (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.overall_grade}
                    onChange={e => setForm(f => ({
                      ...f,
                      overall_grade: e.target.value,
                      letter_grade: e.target.value ? getLetterGrade(Number(e.target.value)) : ''
                    }))}
                    className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Letter Grade</label>
                  <input
                    type="text"
                    value={form.letter_grade}
                    onChange={e => setForm(f => ({ ...f, letter_grade: e.target.value }))}
                    className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">What I liked</label>
                <textarea
                  rows={3}
                  value={form.liked_feedback}
                  onChange={e => setForm(f => ({ ...f, liked_feedback: e.target.value }))}
                  placeholder="Strengths and positive aspects..."
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Needs improvement</label>
                <textarea
                  rows={3}
                  value={form.improvement_feedback}
                  onChange={e => setForm(f => ({ ...f, improvement_feedback: e.target.value }))}
                  placeholder="Areas to work on..."
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Grade'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
