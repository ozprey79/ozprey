// Animate panel contents against a stationary wrapper so scroll measurements
// stay stable and the surrounding sections retain their normal scroll speed.
function scrollLayers(node, layers) {
	let disposed = false;
	let media;
	let observer;
	let frame;

	void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
		.then(([{ gsap }, { ScrollTrigger }]) => {
			if (disposed) return;
			gsap.registerPlugin(ScrollTrigger);
			media = gsap.matchMedia();
			media.add({
				desktop: '(min-width: 1100px)',
				portrait: '(orientation: portrait)',
				motion: '(prefers-reduced-motion: no-preference)'
			}, context => {
				if (!context.conditions.motion || !context.conditions.portrait) return;
				const targets = layers.map(layer => ({ ...layer, node: node.querySelector(layer.selector) }));
				if (targets.some(target => !target.node)) return;
				const desktop = context.conditions.desktop;
				const timeline = gsap.timeline({
					scrollTrigger: {
						trigger: node,
						start: 'top 85%',
						end: 'bottom top',
						scrub: true,
						markers: false,
						invalidateOnRefresh: true
					},
					defaults: { ease: 'none' }
				});
				for (const target of targets) {
					timeline.fromTo(target.node, { y: 0 }, { y: desktop ? target.desktop : target.mobile }, 0);
				}

				// Refresh after fonts or chart content change the wrapper's size.
				// Transforms don't resize the wrapper, so this won't feed back.
				const refresh = () => {
					cancelAnimationFrame(frame);
					frame = requestAnimationFrame(() => ScrollTrigger.refresh());
				};
				observer = new ResizeObserver(refresh);
				observer.observe(node);
				return () => {
					observer?.disconnect();
					cancelAnimationFrame(frame);
				};
			}, node);
		})
		.catch(error => {
			if (!disposed) console.warn('Panel scroll animation unavailable', error);
		});

	return {
		destroy() {
			disposed = true;
			observer?.disconnect();
			cancelAnimationFrame(frame);
			media?.revert();
		}
	};
}

export function workspaceScroll(node) {
	return scrollLayers(node, [
		{ selector: '#selected-film', desktop: 72, mobile: 24 },
		{ selector: '.abacus-panel', desktop: -40, mobile: -12 }
	]);
}

export function mapScroll(node) {
	return scrollLayers(node, [
		{ selector: '.country-section', desktop: 48, mobile: 16 }
	]);
}
