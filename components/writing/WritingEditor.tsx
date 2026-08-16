export function WritingEditor({
  value,
  onChange,
  minChars = 80,
  maxChars = 8000,
  wordTarget,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  minChars?: number;
  maxChars?: number;
  wordTarget?: number;
  disabled?: boolean;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="writing-editor">
      <label htmlFor="writing-draft">Your draft</label>
      <textarea
        id="writing-draft"
        value={value}
        disabled={disabled}
        maxLength={maxChars}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
      />
      <p className="muted">
        {value.length} / {maxChars} characters · {words} words
        {wordTarget ? ` · target ${wordTarget}` : ""} · minimum {minChars} characters
      </p>
    </div>
  );
}
