let cached = null;

export async function getGsap() {
	if (cached) return cached;

	const [
		gsapModule,
		splitModule,
		morphModule
	] = await Promise.all([
		import('gsap/dist/gsap'),
		import('gsap/dist/SplitText'),
		import('gsap/dist/MorphSVGPlugin')
	]);

	const gsap = gsapModule.gsap;
	const SplitText = splitModule.SplitText;
	const MorphSVGPlugin = morphModule.MorphSVGPlugin;

	gsap.registerPlugin(
		SplitText,
		MorphSVGPlugin
	);

	cached = {
		gsap,
		SplitText,
		MorphSVGPlugin
	};

	return cached;
}