export default function LabelPill({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${label.color}1A`, color: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(label.id);
          }}
          className="ml-0.5 opacity-60 hover:opacity-100"
          aria-label={`Remove ${label.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
