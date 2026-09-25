import { ELEMENT_INFO, numberElement } from '../lib/elements';

/** 1~45 번호 선택판 */
export function NumberPicker({ selected, onToggle, disabled = [] }: { selected: number[]; onToggle: (n: number) => void; disabled?: number[] }) {
  return (
    <div className="picker">
      {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
        const on = selected.includes(n);
        const off = disabled.includes(n);
        const info = ELEMENT_INFO[numberElement(n)];
        return (
          <button
            key={n}
            type="button"
            className="pick"
            aria-pressed={on}
            aria-label={`${n}번`}
            disabled={off}
            onClick={() => onToggle(n)}
            style={
              on
                ? { backgroundColor: info.color, borderColor: info.color === '#0E1224' ? 'var(--water-ring)' : info.color, color: info.ink }
                : undefined
            }
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
