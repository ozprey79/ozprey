// Animate the real scroll position so sticky elements and ScrollTrigger stay in sync.
export function smoothScroll({ paused = () => false } = {}) {
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let frame = 0;
	let position = window.scrollY;
	let target = position;
	let velocity = 0;
	let lastTime = 0;
	let writtenY = position;
	const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	const clamp = (value, max) => Math.max(0, Math.min(max, value));

	function stop() {
		cancelAnimationFrame(frame);
		frame = 0;
		velocity = 0;
		position = target = writtenY = window.scrollY;
	}

	function locked() {
		return paused() || [document.documentElement, document.body].some((element) =>
			['hidden', 'clip'].includes(getComputedStyle(element).overflowY)
		);
	}

	function tick(time) {
		if (motion.matches || locked()) return stop();
		const dt = Math.min((time - lastTime) / 1000, 0.032);
		lastTime = time;
		const max = limit();
		target = clamp(target, max);
		// A slightly underdamped spring gives a soft elastic settle.
		// Small integration steps keep the response consistent across frame rates.
		const steps = Math.max(1, Math.ceil(dt / 0.008));
		const step = dt / steps;
		for (let i = 0; i < steps; i++) {
			velocity += ((target - position) * 180 - velocity * 21) * step;
			position += velocity * step;
			if (position < 0 || position > max) {
				position = clamp(position, max);
				velocity = 0;
			}
		}
		const settled = Math.abs(target - position) < 0.25 && Math.abs(velocity) < 1;
		if (settled) position = target;
		window.scrollTo({ top: position, behavior: 'instant' });
		writtenY = window.scrollY;
		if (settled) return stop();
		frame = requestAnimationFrame(tick);
	}

	function wheel(event) {
		if (event.defaultPrevented || !event.cancelable || motion.matches || locked() ||
			event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
		// Leave embedded scrollers and interactive controls in charge of their input.
		for (const element of event.composedPath()) {
			if (element === document.body || element === document.documentElement) break;
			if (!(element instanceof Element)) continue;
			if (element.matches('input, textarea, select, [contenteditable="true"], [data-native-scroll]')) return;
			const style = getComputedStyle(element);
			if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) return;
		}
		const max = limit();
		if (!max || !event.deltaY) return;
		if (!frame) position = target = window.scrollY;
		const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
		target = clamp(target + event.deltaY * unit, max);
		event.preventDefault();
		if (!frame) {
			lastTime = performance.now();
			frame = requestAnimationFrame(tick);
		}
	}

	function externalScroll() {
		// Respect anchors, focus changes, history restoration and other scroll owners.
		if (frame && Math.abs(window.scrollY - writtenY) > 1) stop();
	}
	function keydown(event) {
		if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop();
	}
	window.addEventListener('wheel', wheel, { passive: false });
	window.addEventListener('scroll', externalScroll, { passive: true });
	window.addEventListener('pointerdown', stop, { passive: true });
	window.addEventListener('touchstart', stop, { passive: true });
	window.addEventListener('keydown', keydown);
	window.addEventListener('resize', stop);
	motion.addEventListener('change', stop);

	return {
		stop,
		destroy() {
			stop();
			window.removeEventListener('wheel', wheel);
			window.removeEventListener('scroll', externalScroll);
			window.removeEventListener('pointerdown', stop);
			window.removeEventListener('touchstart', stop);
			window.removeEventListener('keydown', keydown);
			window.removeEventListener('resize', stop);
			motion.removeEventListener('change', stop);
		}
	};
}
