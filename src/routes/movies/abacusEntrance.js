// Keep the chart usable if animation modules cannot load.
export function abacusEntrance(node) {
	let disposed = false;
	let media;
	let timeline;
	let observer;
	let targets = [];
	const showOnFocus = () => {
		timeline?.progress(1);
		timeline?.scrollTrigger?.kill();
	};
	node.addEventListener('focusin', showOnFocus);
	void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
		.then(([{ gsap }, { ScrollTrigger }]) => {
			if (disposed) return;
			gsap.registerPlugin(ScrollTrigger);
			const setup = () => {
				const beads = [...node.querySelectorAll('.bead-motion')];
				if (beads.length === targets.length && beads.every((bead, index) => bead === targets[index])) return;
				targets = beads;
				media?.revert();
			media = gsap.matchMedia();
			media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
				if (context.conditions.reduced) {
					gsap.set(beads, { autoAlpha: 1 });
					return;
				}
				// A keyboard user may already be interacting while the modules load.
				if (node.contains(document.activeElement)) { gsap.set(beads, { autoAlpha: 1 }); return; }
				timeline = gsap.timeline({
					scrollTrigger: {
						trigger: node, start: 'center 85%', toggleActions: 'play none none none', invalidateOnRefresh: true,
						// Temporary positioning guides while tuning the entrance trigger.
						markers: true, id: 'abacus'
					},
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
				return () => { timeline = null; };
			}, node);
			};
			// Children can be populated after the section action mounts.
			observer = new MutationObserver(setup);
			observer.observe(node, { childList: true, subtree: true });
			setup();
		})
		.catch(error => {
			node.querySelectorAll('.bead-motion').forEach(bead => { bead.style.visibility = 'visible'; });
			console.warn('Abacus entrance animation unavailable', error);
		});
	return {
		destroy() {
			disposed = true;
			observer?.disconnect();
			node.removeEventListener('focusin', showOnFocus);
			media?.revert();
		}
	};
}

// Animate an inner group so the force simulation retains control of fish positions.
export function fishEntrance(node, index = 0) {
	let disposed = false;
	let media;
	let animation;
	const showOnFocus = () => {
		animation?.progress(1);
		animation?.scrollTrigger?.kill();
	};
	node.addEventListener('focusin', showOnFocus);
	void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
		.then(([{ gsap }, { ScrollTrigger }]) => {
			if (disposed) return;
			gsap.registerPlugin(ScrollTrigger);
			media = gsap.matchMedia();
			media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
				if (context.conditions.reduced || node.contains(document.activeElement)) { gsap.set(node, { autoAlpha: 1 }); return; }
				animation = gsap.fromTo(node, { x: 35, y: 12, autoAlpha: 0 }, {
					x: 0, y: 0, autoAlpha: 1, duration: 1.25, delay: index * .18,
					ease: 'power3.out', clearProps: 'opacity,transform',
					scrollTrigger: {
						trigger: node.closest('svg'), start: 'center 85%',
						toggleActions: 'play none none none', invalidateOnRefresh: true,
						markers: index === 0, id: 'fishes'
					}
				});
				return () => { animation = null; };
			}, node);
		})
		.catch(error => {
			if (!disposed) node.style.visibility = 'visible';
			console.warn('Fish entrance animation unavailable', error);
		});
	return {
		destroy() {
			disposed = true;
			node.removeEventListener('focusin', showOnFocus);
			media?.revert();
		}
	};
}
