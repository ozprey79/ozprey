// Animate content only; panel rules have their own left-to-right reveal.
export function reveal(node, { distance = 38, duration = 850, kind = 'text' } = {}) {
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
	if (reduced.matches || !window.IntersectionObserver || !node.animate) return {};
	let observer;
	let started = false;
	const frames = kind === 'line'
		? [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
		: [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'translateY(0)' }];
	const animation = node.animate(frames, { duration, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
	animation.pause();
	animation.currentTime = 0;
	animation.finished.then(() => animation.cancel()).catch(() => {});
	function show(immediate = false) {
		if (started && !immediate) return;
		started = true;
		observer?.disconnect();
		if (immediate) animation.cancel();
		else animation.play();
	}
	observer = new IntersectionObserver(entries => {
		if (entries.some(entry => entry.isIntersecting)) show();
	}, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
	observer.observe(node);
	const focus = () => show(true);
	const motionChange = () => { if (reduced.matches) show(true); };
	node.addEventListener('focusin', focus);
	reduced.addEventListener('change', motionChange);
	return {
		destroy() {
			observer.disconnect(); animation.cancel();
			node.removeEventListener('focusin', focus);
			reduced.removeEventListener('change', motionChange);
		}
	};
}

// Preserve the existing border space/colour while revealing an independent rule.
export function drawRules(node) {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.IntersectionObserver || !node.animate) return {};
	const computed = getComputedStyle(node);
	const previousPosition = node.style.position;
	const rules = [];
	if (computed.position === 'static') node.style.position = 'relative';
	for (const side of ['top', 'bottom']) {
		const width = computed.getPropertyValue(`border-${side}-width`);
		const colour = computed.getPropertyValue(`border-${side}-color`);
		if (!parseFloat(width)) continue;
		const property = `border-${side}-color`;
		const previous = node.style.getPropertyValue(property);
		const line = document.createElement('span');
		line.setAttribute('aria-hidden', 'true');
		line.style.cssText = `position:absolute;left:0;right:0;${side}:-${width};height:${width};background:${colour};transform-origin:left center;pointer-events:none;display:block;`;
		node.style.setProperty(property, 'transparent');
		node.appendChild(line);
		const motion = reveal(line, { kind: 'line', duration: 1000 });
		rules.push({ line, motion, property, previous });
	}
	return { destroy() {
		for (const { line, motion, property, previous } of rules) {
			motion.destroy?.(); line.remove();
			if (previous) node.style.setProperty(property, previous);
			else node.style.removeProperty(property);
		}
		node.style.position = previousPosition;
	} };
}
