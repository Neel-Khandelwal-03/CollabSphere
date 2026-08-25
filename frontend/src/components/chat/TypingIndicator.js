export default function TypingIndicator({ names }) {
  if (!names || names.length === 0) return <div className="h-5" />;

  const text =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : `${names.length} people are typing...`;

  return (
    <div className="flex h-5 items-center gap-1.5 px-1 text-xs text-muted">
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted" />
      </span>
      {text}
    </div>
  );
}
