// Keep the chart usable if animation modules cannot load.
export function abacusEntrance(node) {
	let disposed = false;
	let media;
	let timeline;
	let observer;
	let visibility;
	let targets = [];
	const showOnFocus = () => {
		node.dataset.entranceReady = 'true';
		timeline?.progress(1);
		visibility?.disconnect();
	};
	node.addEventListener('focusin', showOnFocus);
	void import('gsap')
		.then(({ gsap }) => {
			if (disposed) return;
			const setup = () => {
				const beads = [...node.querySelectorAll('.bead-motion')];
				if (beads.length === targets.length && beads.every((bead, index) => bead === targets[index])) return;
				targets = beads;
				node.dataset.entranceReady = 'true';
				media?.revert();
				visibility?.disconnect();
			media = gsap.matchMedia();
			media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
				if (context.conditions.reduced) {
					gsap.set(beads, { autoAlpha: 1 });
					return;
				}
				// A keyboard user may already be interacting while the modules load.
				if (node.contains(document.activeElement)) { gsap.set(beads, { autoAlpha: 1 }); return; }
				timeline = gsap.timeline({
					paused: true,
					defaults: { ease: 'power3.out' }
				});
				if (beads.length) timeline.fromTo(beads, {
					x: (_, bead) => parseFloat(getComputedStyle(bead).getPropertyValue('--fx')) || 0,
					y: (_, bead) => parseFloat(getComputedStyle(bead).getPropertyValue('--fy')) || 0,
					autoAlpha: 0
				}, {
					x: 0, y: 0, autoAlpha: 1, duration: 1.25,
					stagger: { amount: .7 }, clearProps: 'opacity,transform'
				}, 0);
				visibility = new IntersectionObserver(entries => {
					if (entries.some(entry => entry.isIntersecting)) { timeline?.play(); visibility.disconnect(); }
				}, { rootMargin: '0px -5% -5% 0px' });
				visibility.observe(node);
				return () => { visibility?.disconnect(); timeline = null; };
			}, node);
			};
			// Children can be populated after the section action mounts.
			observer = new MutationObserver(setup);
			observer.observe(node, { childList: true, subtree: true });
			setup();
		})
		.catch(error => {
			node.dataset.entranceReady = 'true';
			node.querySelectorAll('.bead-motion').forEach(bead => { bead.style.visibility = 'visible'; });
			console.warn('Abacus entrance animation unavailable', error);
		});
	return {
		destroy() {
			disposed = true;
			observer?.disconnect();
			visibility?.disconnect();
			node.removeEventListener('focusin', showOnFocus);
			delete node.dataset.entranceReady;
			media?.revert();
		}
	};
}

// Animate an inner group so the force simulation retains control of fish positions.
export function fishEntrance(node, index = 0) {
	let disposed = false;
	let media;
	let animation;
	let visibility;
	const showOnFocus = () => {
		animation?.progress(1);
		visibility?.disconnect();
	};
	node.addEventListener('focusin', showOnFocus);
	void import('gsap')
		.then(({ gsap }) => {
			if (disposed) return;
			media = gsap.matchMedia();
			media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
				if (context.conditions.reduced || node.contains(document.activeElement)) { gsap.set(node, { autoAlpha: 1 }); return; }
				animation = gsap.fromTo(node, { x: 35, y: 12, autoAlpha: 0 }, {
					x: 0, y: 0, autoAlpha: 1, duration: 1.25, delay: index * .18,
					ease: 'power3.out', clearProps: 'opacity,transform',
					paused: true
				});
					visibility = new IntersectionObserver(entries => {
						if (entries.some(entry => entry.isIntersecting)) { animation?.play(); visibility.disconnect(); }
					}, { rootMargin: '0px -5% -5% 0px' });
					visibility.observe(node.closest('svg') ?? node);
					return () => { visibility?.disconnect(); animation = null; };
			}, node);
		})
		.catch(error => {
			if (!disposed) node.style.visibility = 'visible';
			console.warn('Fish entrance animation unavailable', error);
		});
	return {
		destroy() {
			disposed = true;
			visibility?.disconnect();
			node.removeEventListener('focusin', showOnFocus);
			media?.revert();
		}
	};
}
