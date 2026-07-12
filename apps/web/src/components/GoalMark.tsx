/** 3px color tick + goal name in that color, 12/700. Used once per row (DESIGN-SPEC §6). */
export function GoalMark({ color, name }: { color: string; name: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 3, height: 12, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{name}</span>
    </span>
  );
}
