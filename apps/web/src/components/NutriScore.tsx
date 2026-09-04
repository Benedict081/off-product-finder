/*
 * The official published Nutri-Score colours. These deliberately do NOT come
 * from the theme tokens: the scale is a real-world standard printed on food
 * packaging across Europe, so an E has to be that exact red in light mode, dark
 * mode and print alike.
 */
const GRADE_COLORS: Record<string, string> = {
  a: 'bg-[#038141] text-white',
  b: 'bg-[#85bb2f] text-white',
  c: 'bg-[#fecb02] text-[#1a1d19]',
  d: 'bg-[#ee8100] text-white',
  e: 'bg-[#e63e11] text-white',
};

const GRADES = ['a', 'b', 'c', 'd', 'e'] as const;

const SIZES = {
  sm: 'h-6 w-6 rounded text-xs',
  md: 'h-8 w-8 rounded-md text-sm',
  lg: 'h-11 w-11 rounded-lg text-lg',
} as const;

/** The Nutri-Score letter, in its published colour. */
export function NutriScore({
  grade,
  size = 'md',
}: {
  grade: string;
  size?: keyof typeof SIZES;
}) {
  const color = GRADE_COLORS[grade.toLowerCase()] ?? 'bg-ink-muted text-white';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold uppercase
                  ${SIZES[size]} ${color}`}
      title={`Nutri-Score ${grade.toUpperCase()}`}
    >
      {grade}
    </span>
  );
}

/**
 * The full A–E scale with this product's grade called out.
 *
 * A lone "E" badge tells you nothing unless you already know the scale runs A to
 * E and which end is good. Showing the whole scale is how it is printed on the
 * packaging, and it answers the question without a paragraph of explanation.
 */
export function NutriScoreScale({ grade }: { grade: string }) {
  const active = grade.toLowerCase();

  return (
    <div className="flex items-end gap-1" role="img" aria-label={`Nutri-Score ${active.toUpperCase()}`}>
      {GRADES.map((letter) => {
        const isActive = letter === active;

        return (
          <span
            key={letter}
            aria-hidden
            className={`inline-flex items-center justify-center font-bold uppercase transition-all
                        ${GRADE_COLORS[letter]}
                        ${
                          isActive
                            ? 'h-9 w-9 rounded-md text-base shadow-sm ring-2 ring-ink/15'
                            : 'h-6 w-6 rounded text-[11px] opacity-35'
                        }`}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}
