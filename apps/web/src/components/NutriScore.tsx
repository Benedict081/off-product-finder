const GRADE_COLORS: Record<string, string> = {
  a: 'bg-[#038141]',
  b: 'bg-[#85bb2f]',
  c: 'bg-[#fecb02] text-ink',
  d: 'bg-[#ee8100]',
  e: 'bg-[#e63e11]',
};

/** The official Nutri-Score letter, in its published colour. */
export function NutriScore({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade.toLowerCase()] ?? 'bg-ink-muted';

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded font-bold
                  uppercase text-white ${color}`}
      title={`Nutri-Score ${grade.toUpperCase()}`}
    >
      {grade}
    </span>
  );
}
