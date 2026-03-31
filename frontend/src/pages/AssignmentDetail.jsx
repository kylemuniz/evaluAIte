import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Lock, CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import EssayCard from '../components/EssayCard';
import api from '../api/client';

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      const [asgRes, essaysRes] = await Promise.all([
        api.get(`/api/assignments/${assignmentId}`),
        api.get(`/api/assignments/${assignmentId}/essays`)
      ]);
      setAssignment(asgRes.data);
      setEssays(essaysRes.data.essays || essaysRes.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const manualEssays = essays.filter(e => e.status === 'uploaded' || e.status === 'manually_graded').slice(0, 3);
  const aiGradedEssays = essays.filter(e => e.status === 'ai_graded' || e.status === 'reviewed');
  const reviewQueue = essays.filter(e => e.status === 'ai_graded');
  const reviewed = essays.filter(e => e.status === 'reviewed');
  const manuallyGraded = essays.filter(e => e.status === 'manually_graded');
  const allReviewed = aiGradedEssays.length > 0 && reviewQueue.length === 0;
  const canRunAI = manuallyGraded.length >= 3;
  const totalEssays = essays.length;
  const reviewedCount = reviewed.length + manuallyGraded.length;

  const handleRunAI = async () => {
    setAiRunning(true);
    try {
      await api.post(`/api/assignments/${assignmentId}/grade`);
      await fetchData();
    } catch {
    } finally {
      setAiRunning(false);
    }
  };

  const handleFinalize = async () => {
    if (!allReviewed) return;
    try {
      await api.post(`/api/assignments/${assignmentId}/finalize`);
      fetchData();
    } catch {}
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
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(assignment?.class_id ? `/classes/${assignment.class_id}` : '/dashboard')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{assignment?.title}</h1>
              <StatusBadge status={assignment?.status || 'draft'} />
            </div>
            {assignment?.description && (
              <p className="text-slate-500">{assignment.description}</p>
            )}
          </div>
        </div>

        {/* Progress */}
        {totalEssays > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Grading Progress</h3>
            <ProgressBar
              current={reviewedCount}
              total={totalEssays}
              label="Essays reviewed"
            />
            <div className="flex gap-6 mt-4 text-sm text-slate-600">
              <span><span className="font-medium text-slate-900">{essays.filter(e => e.status === 'uploaded').length}</span> uploaded</span>
              <span><span className="font-medium text-blue-600">{manuallyGraded.length}</span> manually graded</span>
              <span><span className="font-medium text-amber-600">{reviewQueue.length}</span> pending review</span>
              <span><span className="font-medium text-green-600">{reviewed.length}</span> reviewed</span>
            </div>
          </div>
        )}

        {/* AI Notice */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>Teacher in control:</strong> AI suggestions are for assistance only. You review and approve every grade before anything is finalized.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {[
            { id: 'manual', label: 'Manual Grading', count: manualEssays.length },
            { id: 'ai', label: 'AI Grading', count: null },
            { id: 'review', label: 'Review Queue', count: reviewQueue.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          {/* Manual Grading Tab */}
          {activeTab === 'manual' && (
            <div>
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Needs Manual Grading</h2>
                <p className="text-sm text-slate-500 mt-0.5">Grade the first 3 essays to teach the AI your grading style</p>
              </div>
              <div className="p-6 space-y-3">
                {manualEssays.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">All initial essays graded!</p>
                    <p className="text-sm">You can now run AI grading on the remaining essays.</p>
                  </div>
                ) : (
                  manualEssays.map(essay => (
                    <EssayCard
                      key={essay.id}
                      essay={essay}
                      action={essay.status !== 'manually_graded' ? 'Grade Now' : 'View Grade'}
                      onAction={() => navigate(`/assignments/${assignmentId}/essays/${essay.id}/grade`)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* AI Grading Tab */}
          {activeTab === 'ai' && (
            <div>
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">AI Grading</h2>
                <p className="text-sm text-slate-500 mt-0.5">Run AI grading on remaining essays after manual grading is complete</p>
              </div>
              <div className="p-6">
                <div className="text-center py-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                    canRunAI ? 'bg-blue-50' : 'bg-slate-100'
                  }`}>
                    <Brain className={`h-8 w-8 ${canRunAI ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>

                  {aiRunning ? (
                    <div className="space-y-3">
                      <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
                      <p className="text-slate-700 font-medium">AI is analyzing essays...</p>
                      <p className="text-slate-500 text-sm">This may take a few minutes</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-700 font-medium mb-2">
                        {canRunAI
                          ? 'Ready to run AI grading'
                          : `Grade ${3 - manuallyGraded.length} more essay${3 - manuallyGraded.length !== 1 ? 's' : ''} manually first`}
                      </p>
                      <p className="text-slate-500 text-sm mb-6">
                        AI will analyze your {manuallyGraded.length} graded essay{manuallyGraded.length !== 1 ? 's' : ''} to learn your grading style
                      </p>
                      <button
                        onClick={handleRunAI}
                        disabled={!canRunAI}
                        title={!canRunAI ? 'Grade at least 3 essays manually first' : ''}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                          canRunAI
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Brain className="h-5 w-5" />
                        Run AI Grading
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Review Queue Tab */}
          {activeTab === 'review' && (
            <div>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Review Queue</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Review AI-graded essays and approve or modify grades</p>
                </div>
                {aiGradedEssays.length > 0 && (
                  <span className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{reviewed.length}</span>/{aiGradedEssays.length} reviewed
                  </span>
                )}
              </div>
              <div className="p-6 space-y-3">
                {aiGradedEssays.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Brain className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">No AI-graded essays yet</p>
                    <p className="text-sm">Run AI grading to populate this queue</p>
                  </div>
                ) : (
                  aiGradedEssays.map(essay => (
                    <EssayCard
                      key={essay.id}
                      essay={essay}
                      action={essay.status === 'ai_graded' ? 'Review' : 'View'}
                      onAction={() => navigate(`/assignments/${assignmentId}/essays/${essay.id}/review`)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Finalize button */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Finalize and Publish Grades</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {allReviewed
                  ? 'All essays have been reviewed. Ready to publish!'
                  : `${reviewQueue.length} essay${reviewQueue.length !== 1 ? 's' : ''} still need${reviewQueue.length === 1 ? 's' : ''} review before publishing`}
              </p>
            </div>
            <button
              onClick={handleFinalize}
              disabled={!allReviewed || totalEssays === 0}
              title={!allReviewed ? 'Review all AI-graded essays before finalizing' : ''}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                allReviewed && totalEssays > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {!allReviewed || totalEssays === 0 ? <Lock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              Finalize and Publish
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
