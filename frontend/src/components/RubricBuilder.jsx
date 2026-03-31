import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function RubricBuilder({ categories, onChange }) {
  const addCategory = () => {
    onChange([...categories, { id: Date.now(), name: '', description: '', max_points: 10 }]);
  };

  const removeCategory = (id) => {
    onChange(categories.filter(c => c.id !== id));
  };

  const updateCategory = (id, field, value) => {
    onChange(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const total = categories.reduce((sum, c) => sum + (Number(c.max_points) || 0), 0);

  return (
    <div className="space-y-3">
      {categories.map((cat, idx) => (
        <div key={cat.id} className="flex gap-3 items-start p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="mt-2 text-slate-400 cursor-grab">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category Name</label>
              <input
                type="text"
                value={cat.name}
                onChange={e => updateCategory(cat.id, 'name', e.target.value)}
                placeholder="e.g., Thesis Statement"
                className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={cat.description}
                onChange={e => updateCategory(cat.id, 'description', e.target.value)}
                placeholder="What to evaluate"
                className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Points</label>
              <input
                type="number"
                min="1"
                value={cat.max_points}
                onChange={e => updateCategory(cat.id, 'max_points', e.target.value)}
                className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={() => removeCategory(cat.id)}
            className="mt-6 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addCategory}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
        {categories.length > 0 && (
          <p className="text-sm text-slate-600">
            Total: <span className="font-semibold text-slate-900">{total} points</span>
          </p>
        )}
      </div>
    </div>
  );
}
