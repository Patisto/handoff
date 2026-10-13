export function allowedTransition(role: string, from: string, to: string) {
  if (from === to) return true;
  if (role === 'MANAGER') return true;
  return (
    (from === 'TODO' && to === 'IN_PROGRESS') || (from === 'IN_PROGRESS' && to === 'IN_REVIEW')
  );
}
