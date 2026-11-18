// Scenes mark the current interaction button so touch and click share one action.
export function confirmNearbyAction(canvas) {
  const action = canvas.closest('main').querySelector('button[data-nearby-action]');
  if (!action || action.matches(':disabled') || !action.getClientRects().length) return;
  action.click();
}
