import { FileText, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function EssayCard({ essay, action, onAction }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <FileText className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {essay.student_name || essay.filename || `Essay ${essay.id}`}
          </p>
          <p className="text-xs text-slate-500">{essay.filename}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={essay.status} />
        {action && (
          <button
            onClick={() => onAction(essay)}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {action} <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
