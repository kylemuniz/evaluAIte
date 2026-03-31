import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      const [clsRes, asgRes] = await Promise.all([
        api.get(`/api/classes/${classId}`),
        api.get(`/api/classes/${classId}/assignments`)
      ]);
      setCls(clsRes.data);
      setAssignments(asgRes.data.assignments || asgRes.data || []);
    } catch {
    } finally {
      setLoading(false);
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
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{cls?.name || 'Class'}</h1>
            {cls?.description && <p className="text-slate-500 mt-1">{cls.description}</p>}
          </div>
          <button
            onClick={() => navigate(`/assignments/new?classId=${classId}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Assignment
          </button>
        </div>

        {/* Assignments */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Assignments</h2>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-1">No assignments yet</p>
              <p className="text-slate-400 text-sm">Create your first assignment to start grading</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignments.map(asg => (
                <div
                  key={asg.id}
                  onClick={() => navigate(`/assignments/${asg.id}`)}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <FileText className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{asg.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {asg.essay_count ?? 0} essays
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={asg.status || 'draft'} />
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
