const STATUS_STYLES = {
  uploaded: 'bg-slate-100 text-slate-700',
  manually_graded: 'bg-blue-100 text-blue-700',
  ai_graded: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-green-100 text-green-700',
  finalized: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-orange-100 text-orange-700',
  active: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
  uploaded: 'Uploaded',
  manually_graded: 'Manually Graded',
  ai_graded: 'AI Graded',
  reviewed: 'Reviewed',
  finalized: 'Finalized',
  pending: 'Pending',
  active: 'Active',
  draft: 'Draft',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
