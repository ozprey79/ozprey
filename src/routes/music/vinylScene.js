import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Geometry, including both grooved faces and the hollow sleeve, comes from
// Blender. Only the selected release's printed artwork is drawn in the app.
export async function createVinylScene(host, onSpinChange = () => {}) {
	const gltf = await new GLTFLoader().loadAsync('/music/vinyl.glb');
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	renderer.setClearColor(0x000000, 0);
	renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
	host.appendChild(renderer.domElement);
	const scene = new THREE.Scene();
	const model = gltf.scene;
	const bounds = new THREE.Box3().setFromObject(model);
	const center = bounds.getCenter(new THREE.Vector3());
	const size = bounds.getSize(new THREE.Vector3());
	model.position.sub(center);
	const assembly = new THREE.Group();
	assembly.add(model);
	assembly.rotation.set(-.045, -.16, .025);
	scene.add(assembly);
	const record = model.getObjectByName('Vinyl_Record');
	const camera = new THREE.PerspectiveCamera(33, 1, .1, 500);
	camera.position.set(0, 0, 100);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.minPolarAngle = Math.PI * .32;
	controls.maxPolarAngle = Math.PI * .68;
	controls.touches.ONE = THREE.TOUCH.ROTATE;
	scene.add(new THREE.HemisphereLight(0xe9efff, 0x39302a, 1.7));
	const key = new THREE.DirectionalLight(0xfff5e8, 3.2);
	key.position.set(-25, 35, 45); scene.add(key);
	const rim = new THREE.DirectionalLight(0xc8dcff, 1.8);
	rim.position.set(35, 15, 25); scene.add(rim);

	// Long studio reflections reveal the groove direction on dark vinyl.
	const studio = new THREE.Scene();
	studio.background = new THREE.Color(0x30343c);
	for (const [width, height, x, y, z, intensity] of [[12, 55, -30, 12, 35, 3], [8, 42, 35, 18, 25, 2.5], [45, 7, 0, 40, 20, 3]]) {
		const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(intensity), side: THREE.DoubleSide }));
		card.position.set(x, y, z); card.lookAt(0, 0, 0); studio.add(card);
	}
	const generator = new THREE.PMREMGenerator(renderer);
	let environment = generator.fromScene(studio);
	scene.environment = environment.texture;
	studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
	generator.dispose();

	function canvasTexture(width, height = width) {
		const canvas = document.createElement('canvas');
		canvas.width = width; canvas.height = height;
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.flipY = false;
		texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
		return { canvas, context: canvas.getContext('2d'), texture };
	}
	const cover = canvasTexture(1024);
	const back = canvasTexture(1024);
	const label = canvasTexture(1024);
	const grooves = canvasTexture(2048);
	const paperGrain = canvasTexture(128);
	const grainPixels = paperGrain.context.createImageData(128, 128);
	for (let i = 0; i < grainPixels.data.length; i += 4) {
		const value = 150 + Math.round(70 * ((Math.sin(i * 12.9898) * 43758.5453) % 1));
		grainPixels.data[i] = grainPixels.data[i + 1] = grainPixels.data[i + 2] = value;
		grainPixels.data[i + 3] = 255;
	}
	paperGrain.context.putImageData(grainPixels, 0, 0);
	paperGrain.texture.colorSpace = THREE.NoColorSpace;
	paperGrain.texture.wrapS = paperGrain.texture.wrapT = THREE.RepeatWrapping;
	paperGrain.texture.repeat.set(12, 12); paperGrain.texture.needsUpdate = true;
	grooves.texture.colorSpace = THREE.NoColorSpace;
	const grooveContext = grooves.context;
	grooveContext.fillStyle = '#aaa'; grooveContext.fillRect(0, 0, 2048, 2048);
	for (let radius = 349; radius < 1005; radius += .72) {
		grooveContext.beginPath();
		grooveContext.arc(1024, 1024, radius, 0, Math.PI * 2);
		grooveContext.strokeStyle = `rgba(12,12,12,${.22 + .14 * Math.sin(radius * 13.7)})`;
		grooveContext.lineWidth = .36;
		grooveContext.stroke();
	}
	grooves.texture.needsUpdate = true;
	// Tangential anisotropy gives radial highlights rather than a flat glossy disc.
	const directionData = new Uint8Array(256 * 256 * 4);
	for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
		const dx = x - 127.5, dy = y - 127.5, length = Math.hypot(dx, dy) || 1;
		const offset = (y * 256 + x) * 4;
		directionData[offset] = Math.round((-.5 * dy / length + .5) * 255);
		directionData[offset + 1] = Math.round((.5 * dx / length + .5) * 255);
		directionData[offset + 2] = directionData[offset + 3] = 255;
	}
	const directionMap = new THREE.DataTexture(directionData, 256, 256);
	directionMap.needsUpdate = true;
	const vinylMaterial = new THREE.MeshPhysicalMaterial({
		color: 0x090a0c, roughness: .24, metalness: .08,
		clearcoat: .28, clearcoatRoughness: .16, envMapIntensity: 1.5,
		bumpMap: grooves.texture, bumpScale: .006,
		anisotropy: .8, anisotropyMap: directionMap
	});
	const bandMaterial = new THREE.MeshPhysicalMaterial({ color: 0x090a0c, roughness: .17, metalness: .08, clearcoat: .28, clearcoatRoughness: .16, envMapIntensity: 1.5 });
	const coverMaterial = new THREE.MeshStandardMaterial({ map: cover.texture, roughness: .68, envMapIntensity: .35, bumpMap: paperGrain.texture, bumpScale: .004 });
	const backMaterial = new THREE.MeshStandardMaterial({ map: back.texture, roughness: .78, envMapIntensity: .3, bumpMap: paperGrain.texture, bumpScale: .004 });
	const labelMaterial = new THREE.MeshStandardMaterial({ map: label.texture, roughness: .74, envMapIntensity: .3 });
	const replaced = new Set();
	model.traverse(object => {
		if (!object.isMesh) return;
		const replace = material => {
			const next = { 'Pressed black vinyl': vinylMaterial, 'Quiet vinyl bands': bandMaterial, 'Sleeve artwork': coverMaterial, 'Sleeve back artwork': backMaterial, 'Record label artwork': labelMaterial }[material.name];
			if (next) replaced.add(material);
			return next ?? material;
		};
		object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
	});
	replaced.forEach(material => material.dispose());

	let disposed = false, spinning = false, visible = false, frame = 0, lastTime = 0, artworkVersion = 0;
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	function render() { if (!disposed) renderer.render(scene, camera); }
	function animate(time) {
		if (disposed) return;
		if (lastTime && record) record.rotation.z -= Math.min((time - lastTime) / 1000, .05) * .72;
		lastTime = time; render(); frame = requestAnimationFrame(animate);
	}
	function synchronize() {
		cancelAnimationFrame(frame); frame = 0; lastTime = 0;
		if (motion.matches && spinning) { spinning = false; onSpinChange(false); }
		if (!disposed && spinning && visible && !document.hidden) frame = requestAnimationFrame(animate);
	}
	const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize(); });
	intersection.observe(host);
	motion.addEventListener('change', synchronize);
	document.addEventListener('visibilitychange', synchronize);
	new HDRLoader().load('/movies/studio_small_09_1k.hdr', hdr => {
		if (disposed) { hdr.dispose(); return; }
		const pmrem = new THREE.PMREMGenerator(renderer);
		const next = pmrem.fromEquirectangular(hdr);
		scene.environment = next.texture;
		environment.dispose(); environment = next;
		pmrem.dispose(); hdr.dispose(); render();
	}, undefined, () => { /* The procedural studio remains available offline. */ });
	function resize() {
		const width = host.clientWidth, height = host.clientHeight;
		if (!width || !height || disposed) return;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		const distance = Math.max(size.y / 2, size.x / (2 * camera.aspect)) / Math.tan(THREE.MathUtils.degToRad(16.5)) * 1.13;
		camera.position.setLength(distance);
		camera.updateProjectionMatrix(); controls.update(); render();
	}
	const observer = new ResizeObserver(resize); observer.observe(host);
	controls.addEventListener('change', render);

	function fitText(context, text, x, y, width, size, family = 'sans-serif') {
		context.font = `${size}px ${family}`;
		while (context.measureText(text).width > width && size > 16) context.font = `${--size}px ${family}`;
		context.fillText(text, x, y, width);
	}
	function printArtwork(track, image) {
		const ctx = cover.context;
		ctx.fillStyle = '#191d20'; ctx.fillRect(0, 0, 1024, 1024);
		if (image) {
			const scale = Math.max(1024 / image.width, 1024 / image.height);
			ctx.drawImage(image, (1024 - image.width * scale) / 2, (1024 - image.height * scale) / 2, image.width * scale, image.height * scale);
		}
		const shade = ctx.createLinearGradient(0, 500, 0, 1024);
		shade.addColorStop(0, 'rgba(10,14,17,0)'); shade.addColorStop(1, 'rgba(10,14,17,.88)');
		ctx.fillStyle = shade; ctx.fillRect(0, 0, 1024, 1024);
		ctx.fillStyle = '#eee5da';
		ctx.font = '22px sans-serif'; ctx.fillText('OZPREY  /  ON RECORD', 60, 76);
		fitText(ctx, track?.album || track?.title || 'The listening collection', 60, 864, 890, 72, 'Melodrama, serif');
		fitText(ctx, track?.artist || 'Unknown artist', 64, 934, 880, 30);
		cover.texture.needsUpdate = true;
		const rear = back.context;
		rear.fillStyle = '#191d20'; rear.fillRect(0, 0, 1024, 1024);
		rear.fillStyle = '#eee5da'; rear.font = '26px sans-serif'; rear.fillText('THE LISTENING COLLECTION', 70, 90);
		fitText(rear, track?.title || 'Untitled track', 70, 220, 880, 54, 'Melodrama, serif');
		fitText(rear, track?.artist || 'Unknown artist', 70, 290, 880, 30);
		rear.strokeStyle = '#72716c'; rear.beginPath(); rear.moveTo(70, 340); rear.lineTo(954, 340); rear.stroke();
		rear.font = '24px sans-serif'; rear.fillText(`${track?.plays ?? 0} plays  /  Last.fm`, 70, 410); rear.fillText('33⅓ RPM   •   SIDE B', 70, 930);
		back.texture.needsUpdate = true;
		const disc = label.context;
		disc.fillStyle = '#d68c4e'; disc.fillRect(0, 0, 1024, 1024);
		if (image) {
			disc.save(); disc.beginPath(); disc.arc(512, 512, 510, Math.PI, 0); disc.lineTo(1024, 512); disc.lineTo(0, 512); disc.clip();
			disc.drawImage(image, 0, 0, 1024, 1024); disc.fillStyle = '#0007'; disc.fillRect(0, 0, 1024, 1024); disc.restore();
		}
		disc.textAlign = 'center'; disc.fillStyle = '#fff4df';
		fitText(disc, track?.title || 'ON RECORD', 512, 335, 800, 56, 'Melodrama, serif');
		disc.fillStyle = '#211910';
		fitText(disc, track?.artist || 'Unknown artist', 512, 700, 780, 34);
		disc.font = '24px sans-serif'; disc.fillText('SIDE A  /  33⅓ RPM', 512, 790);
		disc.strokeStyle = '#432b2244'; disc.lineWidth = 2;
		for (const radius of [150, 452, 480]) { disc.beginPath(); disc.arc(512, 512, radius, 0, Math.PI * 2); disc.stroke(); }
		label.texture.needsUpdate = true; render();
	}
	resize();
	return {
		setTrack(track) {
			const version = ++artworkVersion;
			printArtwork(track, null);
			// Last.fm's star placeholder is not album artwork. Keep the charcoal
			// sleeve and orange label for releases without an actual image.
			if (!track?.artwork || track.artwork.includes('2a96cbd8b46e442fc41c2b86b821562f')) return;
			const image = new Image();
			image.crossOrigin = 'anonymous';
			image.onload = () => { if (!disposed && version === artworkVersion) printArtwork(track, image); };
			image.src = track.artwork;
		},
		spin(value) { spinning = value && !motion.matches; onSpinChange(spinning); synchronize(); return spinning; },
		rotate(direction) { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .16); controls.update(); render(); },
		reset() { camera.position.set(0, 0, 100); controls.target.set(0, 0, 0); controls.update(); resize(); },
		dispose() {
			disposed = true; artworkVersion++; cancelAnimationFrame(frame);
			observer.disconnect(); intersection.disconnect(); controls.dispose();
			motion.removeEventListener('change', synchronize); document.removeEventListener('visibilitychange', synchronize);
			const geometries = new Set(), materials = new Set();
			scene.traverse(object => {
				if (object.geometry) geometries.add(object.geometry);
				for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
			});
			geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
			for (const texture of [cover.texture, back.texture, label.texture, grooves.texture, paperGrain.texture, directionMap]) texture.dispose();
			environment.dispose(); renderer.dispose(); renderer.domElement.remove();
		}
	};
}
