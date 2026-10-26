<script>
	import Wall3D from './Wall3D.svelte';
	import { WALLP_SVG } from './wallpSvg.js';

	// same props as Wall3D (fill, maxDpr, samples, distortion, smoothFill)
	let props = $props();
</script>

<!-- portrait artwork, with the original's border-radius: 10% 10% -->
<Wall3D svg={WALLP_SVG} radius="10% 10%" {...props} />
