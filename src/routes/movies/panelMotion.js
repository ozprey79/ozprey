export const PANEL_OVERLAP = 0.33;

// The native scroller advances one screen; the outgoing panel travels only 67%.
// Later panels paint over it, leaving the incoming panel fully readable at rest.
export function panelDrift(scroll, index, width) {
	return Math.max(0, Math.min(width, scroll - index * width)) * PANEL_OVERLAP;
}

// A damped spring with zero initial velocity and a small, decaying overshoot.
export function elasticSnap(progress) {
	if (progress <= 0) return 0;
	if (progress >= 1) return 1;
	return 1 - Math.exp(-8 * progress) * (Math.cos(12 * progress) + 2 / 3 * Math.sin(12 * progress));
}
