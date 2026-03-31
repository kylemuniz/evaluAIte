export default function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      {label && (
        <div className="flex justify-between text-sm text-slate-600 mb-1">
          <span>{label}</span>
          <span className="font-medium">{current}/{total}</span>
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!label && (
        <p className="text-xs text-slate-500 mt-1 text-right">{pct}%</p>
      )}
    </div>
  );
}
