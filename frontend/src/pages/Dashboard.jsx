import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, X, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Dashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data.classes || res.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/api/classes', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Classes</h1>
            <p className="text-slate-500 mt-1">Manage your classes and assignments</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Class
          </button>
        </div>

        {/* Classes grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No classes yet</h3>
            <p className="text-slate-500 mb-6">Create your first class to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <div
                key={cls.id}
                onClick={() => navigate(`/classes/${cls.id}`)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md p-6 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-1">{cls.name}</h3>
                {cls.description && (
                  <p className="text-slate-500 text-sm mb-3 line-clamp-2">{cls.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-auto">
                  {cls.assignment_count ?? 0} assignment{(cls.assignment_count ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Create New Class</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Class Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g., English 101"
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of the class"
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
                  {creating ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
