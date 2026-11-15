import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import signatureFontUrl from '$lib/assets/fonts/Clarity-Signature-BF6aa5046924898.otf?url';

// Blender owns the geometry. Only ink on the paper is generated in the browser.
export async function createCassetteScene(host) {
 const gltf = await new GLTFLoader().loadAsync('/music/cassette.glb');
 let font = 'cursive';
 try {
  const face = await new FontFace('Cassette Signature', `url(${signatureFontUrl})`).load();
  document.fonts.add(face); font = '"Cassette Signature"';
 } catch { /* A system handwriting font keeps the label usable offline. */ }
 const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
 renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
 renderer.toneMapping = THREE.NeutralToneMapping;
 renderer.toneMappingExposure = 1;
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.setClearColor(0x000000, 0);
 host.appendChild(renderer.domElement);
 renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y';
 const scene = new THREE.Scene();
 const pmrem = new THREE.PMREMGenerator(renderer);
 // Match the jewel case studio: subdued reflections, transparent CSS backdrop.
 const studio = new THREE.Scene();
 studio.background = new THREE.Color(0x303741);
 function softbox(w,h,x,y,z,intensity) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({
   color:new THREE.Color().setScalar(intensity), side:THREE.DoubleSide
  }));
  card.position.set(x,y,z); card.lookAt(0,0,0); studio.add(card);
 }
 softbox(2.4,7,-3,1,3,2.8); softbox(1.8,6,4,0,2,2.2);
 softbox(5,2,0,4,2,2.8); softbox(3,1.2,-1,-3,3,1.8);
 let environment = pmrem.fromScene(studio, .10);
 scene.environment = environment.texture;
 studio.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); pmrem.dispose();
 // Default Three transmission captures an opaque background. Capture the
 // internals with alpha, as in jewelScene, so empty plastic stays see-through.
 const transmissionCapture = new THREE.WebGLRenderTarget(1,1,{
  type:THREE.HalfFloatType, samples:4, generateMipmaps:true,
  minFilter:THREE.LinearMipmapLinearFilter
 });
 const captureSize = new THREE.Vector2();
 const clear = new THREE.MeshPhysicalMaterial({
  name:'Cassette clear polystyrene', color:0xffffff, metalness:0,
  roughness:.045, transmission:1, opacity:1, transparent:false,
  ior:1.49, thickness:.10, attenuationColor:new THREE.Color(0xf4faff),
  attenuationDistance:24, specularIntensity:1, envMapIntensity:.45,
  side:THREE.FrontSide, depthWrite:true
 });
 clear.onBeforeCompile = shader => {
  shader.uniforms.cassetteTransmissionMap = {value:transmissionCapture.texture};
  shader.uniforms.cassetteTransmissionSize = {value:captureSize};
  shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_pars_fragment>',
   THREE.ShaderChunk.transmission_pars_fragment
    .replaceAll('transmissionSamplerMap','cassetteTransmissionMap')
    .replaceAll('transmissionSamplerSize','cassetteTransmissionSize'));
  shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>',`
   #include <dithering_fragment>
   gl_FragColor.rgb=clamp(gl_FragColor.rgb,0.0,1.0);
   gl_FragColor.a=max(gl_FragColor.a,max(gl_FragColor.r,max(gl_FragColor.g,gl_FragColor.b)));
  `);
 };
 clear.customProgramCacheKey = () => 'cassette-transparent-transmission-v1';
 const plasticParts = [], replacedMaterials = new Set();
 const model = gltf.scene;
 scene.add(model);
 model.rotation.set(-.10, -.25, .025);
 model.traverse(o => {
  if (!o.isMesh) return;
  if (o.material.name === 'Clear moulded plastic') {
   replacedMaterials.add(o.material);
   o.material = clear;
   plasticParts.push(o);
  }
 });
 replacedMaterials.forEach(material => material.dispose());
 scene.add(new THREE.HemisphereLight(0xe1eeff, 0x171921, .35));
 const light = new THREE.DirectionalLight(0xffffff, .65);
 light.position.set(-4, 8, 10); scene.add(light);
 const rim = new THREE.DirectionalLight(0xc5dfff,.35);
 rim.position.set(4,2,-2); scene.add(rim);
 const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
 camera.position.set(0, 0, 17);
 const controls = new OrbitControls(camera, renderer.domElement);
 controls.enablePan = false; controls.enableZoom = false;
 controls.minPolarAngle = Math.PI * .22; controls.maxPolarAngle = Math.PI * .78;
 controls.touches.ONE = THREE.TOUCH.ROTATE;
 const canvas = document.createElement('canvas');
 canvas.width = 2048; canvas.height = 300;
 const ctx = canvas.getContext('2d');
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
 const labelMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: .9 });
 for (const side of [-1, 1]) {
  const label = new THREE.Mesh(new THREE.PlaneGeometry(8.12, 1.13), labelMaterial);
  label.position.set(0, 1.83, side * .646);
  if (side < 0) label.rotation.y = Math.PI;
  model.add(label);
 }
 let disposed = false;
 function render() {
  if (disposed) return;
  renderer.getDrawingBufferSize(captureSize);
  if (transmissionCapture.width !== captureSize.x || transmissionCapture.height !== captureSize.y) {
   transmissionCapture.setSize(captureSize.x,captureSize.y);
  }
  const visibleParts = plasticParts.filter(part => part.visible);
  const toneMapping = renderer.toneMapping;
  const target = renderer.getRenderTarget();
  try {
   visibleParts.forEach(part => part.visible = false);
   renderer.toneMapping = THREE.NoToneMapping;
   renderer.setRenderTarget(transmissionCapture);
   renderer.render(scene,camera);
  } finally {
   visibleParts.forEach(part => part.visible = true);
   renderer.setRenderTarget(target);
   renderer.toneMapping = toneMapping;
  }
  renderer.render(scene,camera);
 }
 new HDRLoader().load('/movies/studio_small_09_2k.hdr', hdr => {
  if (disposed) { hdr.dispose(); return; }
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  const lightingScene = new THREE.Scene(); lightingScene.background = hdr;
  const next = generator.fromScene(lightingScene,.10);
  scene.environment = next.texture;
  environment.dispose(); environment = next;
  generator.dispose(); hdr.dispose(); render();
 },undefined,error => console.warn('Cassette studio HDR unavailable; using procedural studio.',error));
 function resize() {
  const width = host.clientWidth, height = host.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.setLength(Math.max(16, 6.1 / (Math.tan(THREE.MathUtils.degToRad(16.5)) * camera.aspect)));
  camera.updateProjectionMatrix(); render();
 }
 controls.addEventListener('change', render);
 const observer = new ResizeObserver(resize); observer.observe(host);
 function fit(text, y, size, family) {
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > 1850 && size > 25) ctx.font = `${--size}px ${family}`;
  ctx.fillText(text, 80, y, 1850);
 }
 return {
  setTrack(track) {
   ctx.fillStyle = '#eeeee5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
   ctx.strokeStyle = '#a5aaa3'; ctx.lineWidth = 2;
   for (const y of [174, 265]) { ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(1998, y); ctx.stroke(); }
   ctx.fillStyle = '#202b31';
   fit(track?.title || 'Untitled track', 150, 134, font);
   fit(track?.artist || 'Unknown artist', 248, 48, 'sans-serif');
   texture.needsUpdate = true; render();
  },
  reset() { camera.position.set(0, 0, 17); controls.target.set(0,0,0); controls.update(); resize(); },
  rotate(direction) {
   const offset = camera.position.clone();
   offset.applyAxisAngle(new THREE.Vector3(0,1,0), direction * .15);
   camera.position.copy(offset); controls.update(); render();
  },
  dispose() {
   disposed = true; observer.disconnect(); controls.dispose();
   const geometries = new Set(), materials = new Set();
   scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
   geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
   texture.dispose(); environment.dispose(); transmissionCapture.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
 };
}
