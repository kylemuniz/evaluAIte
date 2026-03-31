import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, X, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import RubricBuilder from '../components/RubricBuilder';
import api from '../api/client';

const STEPS = ['Details', 'Rubric', 'Guidance', 'Essays'];

export default function NewAssignment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ title: '', description: '' });
  const [categories, setCategories] = useState([
    { id: 1, name: 'Content', description: 'Quality and relevance of content', max_points: 25 },
    { id: 2, name: 'Structure', description: 'Organization and flow', max_points: 25 },
    { id: 3, name: 'Grammar', description: 'Grammar and mechanics', max_points: 25 },
    { id: 4, name: 'Argument', description: 'Strength of argument', max_points: 25 },
  ]);
  const [guidance, setGuidance] = useState('');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      f.name.endsWith('.docx') || f.name.endsWith('.odt') || f.name.endsWith('.pdf') || f.name.endsWith('.txt')
    );
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !existing.has(f.name))];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      // Create assignment
      const asgRes = await api.post('/api/assignments', {
        class_id: classId,
        title: form.title,
        description: form.description,
        teacher_guidance: guidance,
        rubric_categories: categories.map(c => ({
          name: c.name,
          description: c.description,
          max_points: Number(c.max_points)
        }))
      });
      const assignmentId = asgRes.data.id || asgRes.data.assignment?.id;

      // Upload essays
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach(f => fd.append('files', f));
        await api.post(`/api/assignments/${assignmentId}/essays`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      navigate(`/assignments/${assignmentId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create assignment');
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.title.trim().length > 0;
    if (step === 1) return categories.length > 0 && categories.every(c => c.name.trim());
    return true;
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => classId ? navigate(`/classes/${classId}`) : navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">New Assignment</h1>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i < step
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : i === step
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-slate-900' : 'text-slate-500'}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 rounded ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          {/* Step 0: Details */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Assignment Details</h2>
                <p className="text-slate-500 text-sm">Give your assignment a title and description</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Persuasive Essay - Climate Change"
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the assignment requirements..."
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 1: Rubric */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Grading Rubric</h2>
                <p className="text-slate-500 text-sm">Define the categories you will use to grade essays</p>
              </div>
              <RubricBuilder categories={categories} onChange={setCategories} />
            </div>
          )}

          {/* Step 2: Guidance */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Teacher Guidance for AI</h2>
                <p className="text-slate-500 text-sm">Help the AI understand your grading style and priorities</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Describe what makes an excellent essay, common mistakes to penalize, and any specific requirements you value most.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Grading Guidance</label>
                <textarea
                  value={guidance}
                  onChange={e => setGuidance(e.target.value)}
                  rows={8}
                  placeholder="e.g., I value clear thesis statements highly. Essays with strong supporting evidence should receive bonus consideration. Poor grammar should result in significant deductions in the Grammar category. Students are expected to cite at least 3 sources..."
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Essays */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload Essays</h2>
                <p className="text-slate-500 text-sm">Upload student essays (DOCX, ODT, PDF, or TXT files)</p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('essay-upload').click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 font-medium">Drop files here or click to browse</p>
                <p className="text-slate-500 text-sm mt-1">Supports .docx, .odt, .pdf, .txt</p>
                <input
                  id="essay-upload"
                  type="file"
                  multiple
                  accept=".docx,.odt,.pdf,.txt"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>

              {/* Files list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Assignment
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
