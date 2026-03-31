import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Brain, Edit3 } from 'lucide-react';
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

export default function ReviewEssay() {
  const { assignmentId, essayId } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    overall_grade: '',
    letter_grade: '',
    rubric_scores: {},
    liked_feedback: '',
    improvement_feedback: '',
  });

  useEffect(() => {
    fetchData();
  }, [essayId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [essayRes, asgRes] = await Promise.all([
        api.get(`/api/essays/${essayId}`),
        api.get(`/api/assignments/${assignmentId}`)
      ]);
      setEssay(essayRes.data);
      setAssignment(asgRes.data);

      const aiGrade = essayRes.data.ai_grade || essayRes.data.grade;
      if (aiGrade) {
        const scores = {};
        (aiGrade.rubric_scores || []).forEach(s => {
          scores[s.category_id || s.category_name] = s.score;
        });
        setForm({
          overall_grade: aiGrade.overall_grade || '',
          letter_grade: aiGrade.letter_grade || getLetterGrade(aiGrade.overall_grade) || '',
          rubric_scores: scores,
          liked_feedback: aiGrade.liked_feedback || aiGrade.strengths || '',
          improvement_feedback: aiGrade.improvement_feedback || aiGrade.areas_for_improvement || '',
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const aiGrade = essay?.ai_grade;
  const rubricCategories = assignment?.rubric_categories || [];

  const handleReview = async (override = false) => {
    setSaving(true);
    setError('');
    try {
      const rubricScores = rubricCategories.map(c => ({
        category_id: c.id,
        category_name: c.name,
        score: Number(form.rubric_scores[c.id || c.name]) || 0,
        max_points: c.max_points,
      }));
      await api.post(`/api/essays/${essayId}/review`, {
        overall_grade: Number(form.overall_grade),
        letter_grade: form.letter_grade,
        rubric_scores: rubricScores,
        liked_feedback: form.liked_feedback,
        improvement_feedback: form.improvement_feedback,
        overridden: override,
      });
      navigate(`/assignments/${assignmentId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const isOverride = aiGrade && String(form.overall_grade) !== String(aiGrade.overall_grade);

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
        {/* Back */}
        <button
          onClick={() => navigate(`/assignments/${assignmentId}`)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignment
        </button>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-slate-900">Review Essay</h1>
          {essay?.student_name && (
            <span className="text-slate-500">— {essay.student_name}</span>
          )}
        </div>

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

          {/* Right: Review panel */}
          <div className="flex flex-col overflow-y-auto gap-4">
            {/* AI Grade card */}
            {aiGrade && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">AI Suggested Grade</h3>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-amber-900">{aiGrade.overall_grade || '—'}</p>
                    <p className="text-amber-700 text-sm">out of 100</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-800">{aiGrade.letter_grade || getLetterGrade(aiGrade.overall_grade)}</p>
                    <p className="text-amber-700 text-sm">letter grade</p>
                  </div>
                  {aiGrade.confidence && (
                    <div className="ml-auto text-right">
                      <p className="text-lg font-semibold text-amber-900">{Math.round(aiGrade.confidence * 100)}%</p>
                      <p className="text-amber-700 text-xs">AI confidence</p>
                    </div>
                  )}
                </div>

                {/* AI Rubric scores */}
                {rubricCategories.length > 0 && aiGrade.rubric_scores && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-amber-700 mb-2 uppercase tracking-wide">Rubric Scores</p>
                    <div className="space-y-1">
                      {aiGrade.rubric_scores.map((s, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-amber-800">{s.category_name || s.name}</span>
                          <span className="font-medium text-amber-900">{s.score}/{s.max_points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Feedback */}
                {aiGrade.strengths && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1 uppercase tracking-wide">Strengths</p>
                    <p className="text-sm text-amber-800">{aiGrade.strengths}</p>
                  </div>
                )}
                {aiGrade.areas_for_improvement && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1 uppercase tracking-wide">Areas for Improvement</p>
                    <p className="text-sm text-amber-800">{aiGrade.areas_for_improvement}</p>
                  </div>
                )}

                {/* Reasoning (collapsible) */}
                {aiGrade.reasoning && (
                  <div>
                    <button
                      onClick={() => setShowReasoning(r => !r)}
                      className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                    >
                      {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {showReasoning ? 'Hide' : 'Show'} AI Reasoning
                    </button>
                    {showReasoning && (
                      <p className="mt-2 text-xs text-amber-800 bg-amber-100 rounded-lg p-3">{aiGrade.reasoning}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Your Grade section */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Your Grade</h3>
                {aiGrade && (
                  <span className="text-xs text-slate-500 ml-auto">Pre-filled from AI suggestion</span>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Grades */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Overall Grade</label>
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

                {/* Rubric scores */}
                {rubricCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rubric Scores</label>
                    <div className="space-y-2">
                      {rubricCategories.map(cat => {
                        const key = cat.id || cat.name;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="flex-1 text-sm text-slate-700">{cat.name}</span>
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

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">What I liked</label>
                  <textarea
                    rows={3}
                    value={form.liked_feedback}
                    onChange={e => setForm(f => ({ ...f, liked_feedback: e.target.value }))}
                    className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Needs improvement</label>
                  <textarea
                    rows={3}
                    value={form.improvement_feedback}
                    onChange={e => setForm(f => ({ ...f, improvement_feedback: e.target.value }))}
                    className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  {isOverride ? (
                    <button
                      onClick={() => handleReview(true)}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors"
                    >
                      {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Edit3 className="h-4 w-4" />}
                      Override and Review
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReview(false)}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
                    >
                      {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle className="h-4 w-4" />}
                      Mark as Reviewed
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
