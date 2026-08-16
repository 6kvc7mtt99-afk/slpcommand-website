export function OptionList({
  options,
  selected,
  locked,
  correctIndex,
  onSelect,
}: {
  options: string[];
  selected: number | null;
  locked: boolean;
  correctIndex?: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="option-list" role="group" aria-label="Answer options">
      {options.map((option, index) => {
        const isSelected = selected === index;
        const isCorrect = locked && correctIndex != null && index === correctIndex;
        const isWrong = locked && isSelected && correctIndex != null && index !== correctIndex;
        return (
          <button
            key={`${index}-${option}`}
            type="button"
            className={`option-btn${isSelected ? " selected" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}
            onClick={() => onSelect(index)}
            disabled={locked}
            aria-pressed={isSelected}
          >
            <span className="option-key" aria-hidden="true">
              {index + 1}
            </span>
            <span>{option}</span>
            {isCorrect ? <span className="option-mark">Correct</span> : null}
            {isWrong ? <span className="option-mark">Your answer</span> : null}
          </button>
        );
      })}
    </div>
  );
}
