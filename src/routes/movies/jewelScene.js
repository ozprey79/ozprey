import { movieLabel } from './movieLabel.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildJewelGeometry } from './jewelGeometry.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


// Every structural part is actual geometry. Only the printed label uses an image.
export async function createJewelScene(host) {
 let imported=null;
 try { imported=(await new GLTFLoader().loadAsync('/movies/jewel-case.glb')).scene; }
 catch(error){ console.warn('Using procedural case fallback',error); }
 const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
 renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = .8;
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 host.appendChild(renderer.domElement);
 renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
 const scene = new THREE.Scene();
 scene.background = null;
 renderer.setClearColor(0x000000, 0);
 const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
 camera.position.set(0, 0, 10);
 const pmrem = new THREE.PMREMGenerator(renderer);
 // A dark photography studio with narrow softboxes produces defined reflections,
 // instead of a uniformly bright room that turns clear surfaces grey.
 const studio = new THREE.Scene();
 studio.background = new THREE.Color(0x303741);
 function softbox(w,h,x,y,z,intensity) {
  const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity),side:THREE.DoubleSide}));
  card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
 }
 softbox(1.4,7,-3,1,3,5);softbox(.9,6,4,0,2,4);
 softbox(5,1.1,0,4,2,5);softbox(3,.5,-1,-3,3,3);
 softbox(2,5,-4,0,-2,3);
 // Preserve sharp HDR studio detail for the glass reflection shader.
 const reflectionTarget = new THREE.WebGLCubeRenderTarget(512, {type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
 const reflectionCamera = new THREE.CubeCamera(.1,30,reflectionTarget);
 reflectionCamera.update(renderer,studio);
 let environment = pmrem.fromScene(studio, .015);
 scene.environment = environment.texture;
 studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe1eeff, 0x171921, .35));
 const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-3, 5, 5); key.castShadow=true;key.shadow.mapSize.set(2048,2048);
 key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
 key.shadow.camera.near=.1;key.shadow.camera.far=25;key.shadow.normalBias=.025;key.shadow.bias=-.0003;key.shadow.radius=4;
 scene.add(key);
 const receiver=new THREE.Mesh(new THREE.PlaneGeometry(30,20),new THREE.ShadowMaterial({opacity:.24}));
 receiver.position.z=-1.6;receiver.receiveShadow=true;
 // Floating product view: a stationary shadow plane creates detached black wedges.
 // Keep occlusion local to the fitted parts instead of projecting onto empty space.
 const model = new THREE.Group(); scene.add(model);
 const caseInverse = new THREE.Matrix4();
 // Thin polished surfaces: reflected studio cards control both colour and
 // coverage. Multiplying all reflections by a low constant opacity erased
 // the highlights in the previous version.
 function clearSurface(base, grazing) {
  return new THREE.ShaderMaterial({
   transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
   uniforms: { faceAlpha: {value:base}, edgeAlpha: {value:grazing}, studioMap: {value:reflectionTarget.texture}, caseInverse: {value:caseInverse} },
   vertexShader: `
    varying vec3 surfacePosition;
    varying vec3 surfaceNormal;
    void main() {
     vec4 local = vec4(position, 1.0);
     vec3 localNormal = normal;
     #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      localNormal = mat3(instanceMatrix) * localNormal;
     #endif
     vec4 world = modelMatrix * local;
     surfacePosition = world.xyz;
     surfaceNormal = normalize(mat3(modelMatrix) * localNormal);
     gl_Position = projectionMatrix * viewMatrix * world;
    }
   `,
   fragmentShader: `
    uniform samplerCube studioMap;
    uniform mat4 caseInverse;
    uniform float faceAlpha;
    uniform float edgeAlpha;
    varying vec3 surfacePosition;
    varying vec3 surfaceNormal;
    // A reflected ray intersects a finite rectangular studio softbox.
    float card(vec3 ray, vec3 center, vec3 axisU, vec3 axisV, vec2 halfSize) {
     vec3 n = normalize(cross(axisU, axisV));
     float denom = dot(ray, n);
     if (abs(denom) < 0.0001) return 0.0;
     float t = dot(center - surfacePosition, n) / denom;
     if (t <= 0.0) return 0.0;
     vec3 hit = surfacePosition + ray * t - center;
     vec2 q = abs(vec2(dot(hit, axisU), dot(hit, axisV)));
     vec2 feather = max(halfSize * 0.14, vec2(0.045));
     vec2 mask = 1.0 - smoothstep(halfSize - feather, halfSize + feather, q);
     return mask.x * mask.y;
    }
    void main() {
     vec3 n = normalize(surfaceNormal) * (gl_FrontFacing ? 1.0 : -1.0);
     vec3 view = normalize(cameraPosition - surfacePosition);
     vec3 ray = reflect(-view, n);
     float fresnel = 0.04 + 0.96 * pow(1.0 - abs(dot(n, view)), 5.0);
     float left = card(ray, vec3(-2.8,0.5,4.0),vec3(1,0,0),vec3(0,1,0),vec2(.32,4.5));
     float right = card(ray, vec3(3.5,0,3.5),vec3(1,0,0),vec3(0,1,0),vec2(.16,4.0));
     float top = card(ray, vec3(0,3.8,3),vec3(1,0,0),vec3(0,1,0),vec2(4.0,.28));
     float side = card(ray, vec3(-4,0,0),vec3(0,0,1),vec3(0,1,0),vec2(3.0,4.0));
     float bottom = card(ray, vec3(0,-4,1),vec3(1,0,0),vec3(0,0,1),vec2(4.0,2.0));
     float spec = left + right * .8 + top * .9 + side * .6 + bottom * .45;
     // Full surrounding studio reflections fill gaps between the finite cards.
     // The cube render target is linear HDR, so bright sources remain distinct.
     // Softer reflection on the broad window, sharper on structural bevels.
     float reflectionBlur = mix(2.5, .65, clamp(edgeAlpha * 2.0,0.0,1.0));
     vec3 reflected = textureCube(studioMap, ray, reflectionBlur).rgb;
     float bevel = pow(1.0 - abs(dot(n, view)), 2.0);
     // Restrained chromatic fringe at oblique bevels, not a rainbow lid wash.
     vec3 tangent = cross(n, vec3(0.0,1.0,0.0));
     tangent = length(tangent) > .001 ? normalize(tangent) : vec3(1.0,0.0,0.0);
     float separation = .008 * bevel;
     reflected.r = textureCube(studioMap, normalize(ray + tangent * separation), reflectionBlur).r;
     reflected.b = textureCube(studioMap, normalize(ray - tangent * separation), reflectionBlur).b;
     float bright = max(reflected.r, max(reflected.g, reflected.b));
     float reflectionWeight = .008 + fresnel * .13;
     float highlight = clamp(spec * .012 + bright * reflectionWeight, 0.0, .65);
     // Small intense sources produce sharp specular glints on curved mouldings.
     float glint = pow(max(dot(ray,normalize(vec3(-.6,.8,1.0))),0.0),380.0)
                 + .7 * pow(max(dot(ray,normalize(vec3(.8,-.35,1.0))),0.0),520.0);
     highlight = clamp(highlight + glint * (.12 + bevel * .4),0.0,.55);
     float coverage = clamp(faceAlpha + fresnel * edgeAlpha * .35 + highlight, 0.0, .98);
     vec3 spectral = reflected / max(bright, .001);
     // Artistic photoelastic stress bands, anchored to the moulded case.
     // This suggests polarized stress colours; it is not a stress simulation.
     vec3 p = (caseInverse * vec4(surfacePosition,1.0)).xyz;
     float perimeter = min(abs(abs(p.x)-2.12), abs(abs(p.y)-1.84));
     float hingeDistance = length(vec2((p.x+2.05)*1.6, abs(p.y)-1.47));
     float wellDistance = length(vec2(min(abs(p.x+1.32),abs(p.x-1.55)),abs(p.y)-1.35));
     float rimStress = exp(-perimeter*15.0);
     float hingeStress = exp(-hingeDistance*7.0);
     float wellStress = exp(-abs(wellDistance-.26)*24.0);
     float stress = clamp(max(rimStress,max(hingeStress,wellStress)),0.0,1.0);
     float retardance = 1.5 + perimeter*9.0 + hingeStress*1.8
                      + sin(p.y*4.0+p.x*2.0)*.12 + bevel*.55;
     vec3 interference = .5 + .5*cos(6.2831853*retardance*vec3(1.0,1.22,1.48));
     interference = mix(vec3(.25),interference,.85);
     float colourWeight = stress*(.35 + .45*bevel);
     // Retain HDR energy and colour until the final tone-mapping step.
     vec3 reflectionColour = mix(reflected * .32, interference * max(bright*.22,.22),colourWeight*.55);
     // Keep the clear central lid almost untinted; bands collect at mouldings.
     float stressCoverage = stress * (.025 + edgeAlpha*.15) * (.5 + bevel);
     coverage = clamp(coverage + stressCoverage,0.0,.65);
     reflectionColour = mix(reflectionColour,interference,stressCoverage/max(coverage,.001));
     vec3 colour = mix(vec3(.32,.39,.46), reflectionColour,
       clamp((highlight + glint + stressCoverage) / max(coverage,.001),0.0,1.0));
     gl_FragColor = vec4(colour, coverage);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }
   `
  });
 }
 const glass = clearSurface(.014, .18);
 const edge = clearSurface(.075, .58);
 const moulding = clearSurface(.045, .45);
 const silver = new THREE.MeshPhysicalMaterial({ color: 0xb8c1cc, metalness: 1, roughness: .16, iridescence: .6, iridescenceIOR: 1.3, iridescenceThicknessRange: [180,380] });
 function mesh(geometry, material, x=0,y=0,z=0) { const obj=new THREE.Mesh(geometry,material); obj.position.set(x,y,z);if(material.transparent)obj.renderOrder=z>.1?3:1;model.add(obj);return obj; }
 function box(w,h,d,x,y,z,material=glass,r=.035) { return mesh(new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z); }
 let assembly;
 if(imported){
  assembly=new THREE.Group();assembly.name='Blender finished jewel case';
  const groups={};const names=['rear-shell','front-lid','disc-tray','hinges','spring-hub'];
  for(const name of names){groups[name]=new THREE.Group();groups[name].name=name;assembly.add(groups[name]);}
  imported.updateMatrixWorld(true);
  const sourceMaterials=new Set();
  imported.traverse(o=>{
   if(!o.isMesh)return;
   let parent=o.parent;while(parent&&!names.includes(parent.name))parent=parent.parent;
   const part=parent?.name||'rear-shell';
   const material={glass,edge,moulding}[o.material.name]||moulding;
   const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld).scale(4.458/.142,4.458/.142,4.458/.142);
   const object=new THREE.Mesh(geometry,material);object.name=o.name;object.renderOrder=part==='front-lid'?3:1;
   groups[part].add(object);o.geometry.dispose();sourceMaterials.add(o.material);
  });
  sourceMaterials.forEach(m=>m.dispose());
  // Preserve the tiny flutes without hundreds of transparent draw calls.
  const flutes=groups['front-lid'].children.filter(o=>o.name.startsWith('vertical_sidewall_microflutes')||o.name.startsWith('vertical sidewall microflutes'));
  if(flutes.length>1){
   const joined=mergeGeometries(flutes.map(o=>o.geometry));
   if(joined){const ribMesh=new THREE.Mesh(joined,edge);ribMesh.name='sidewall microflutes';ribMesh.renderOrder=3;groups['front-lid'].add(ribMesh);
    for(const o of flutes){groups['front-lid'].remove(o);o.geometry.dispose();}}
  }
 }else assembly=buildJewelGeometry({glass,edge,moulding});
 model.add(assembly);
 const lid=assembly.getObjectByName('front-lid');
 const hingePivot=new THREE.Group();hingePivot.name='working spine pivot';hingePivot.position.set(-2.135,0,-.006);model.add(hingePivot);
 model.updateMatrixWorld(true);hingePivot.attach(lid);
 // Bright physical hinge hardware makes the fitted pivot legible under HDR light.
 const hingeMaterial=clearSurface(.10,.65);
 assembly.getObjectByName('hinges').traverse(o=>{if(o.isMesh){o.material=hingeMaterial;o.castShadow=false;}});
 assembly.getObjectByName('spring-hub').traverse(o=>{if(o.isMesh){o.material=hingeMaterial;o.castShadow=false;}});
 // Local ambient-occlusion approximation at the seat and centre contact areas.
 // Soft annular gradients are attached to the tray, not to the opening lid.
 function contactRing(inner,outer,z,strength){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
   uniforms:{inner:{value:inner},outer:{value:outer},strength:{value:strength}},
   vertexShader:'varying vec2 q;void main(){q=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'varying vec2 q;uniform float inner;uniform float outer;uniform float strength;void main(){float r=length(q);float t=clamp((r-inner)/(outer-inner),0.0,1.0);gl_FragColor=vec4(0.015,0.02,0.025,strength*sin(t*3.14159265));}' });
  const ring=mesh(new THREE.RingGeometry(inner,outer,128),material,.12,0,z);ring.renderOrder=2;
 }
 contactRing(1.76,1.86,-.012,.38);contactRing(.15,.38,.028,.25);
 const discX=.12;
 const discProfile=[new THREE.Vector2(.35,-.018),new THREE.Vector2(1.778,-.018),new THREE.Vector2(1.78,-.013),new THREE.Vector2(1.78,.022),new THREE.Vector2(1.776,.025),new THREE.Vector2(.35,.025),new THREE.Vector2(.35,-.018)];
 const discBody=mesh(new THREE.LatheGeometry(discProfile,192),silver,discX,0,0);discBody.rotation.x=Math.PI/2;

 const disc=mesh(new THREE.RingGeometry(.35,1.78,128),new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.32,metalness:.12,clearcoat:1,clearcoatRoughness:.065,iridescence:.55,iridescenceIOR:1.45,iridescenceThicknessRange:[180,420],envMapIntensity:.65,side:THREE.FrontSide}),discX,0,.028);
 // Planar UVs across the disc, rather than the polar UVs of RingGeometry.
 const pos=disc.geometry.attributes.position,uv=disc.geometry.attributes.uv;
 for(let i=0;i<pos.count;i++) uv.setXY(i,pos.getX(i)/3.56+.5,pos.getY(i)/3.56+.5);
 const discRim=mesh(new THREE.TorusGeometry(1.78,.009,8,128),silver,discX,0,.015);
 // Move the whole physical disc together, leaving the spindle in the tray.
 const floatingDisc=new THREE.Group();floatingDisc.name='lift-out disc';floatingDisc.position.set(discX,0,0);model.add(floatingDisc);
 model.updateMatrixWorld(true);
 for(const part of [discBody,disc,discRim])floatingDisc.attach(part);
 const label=document.createElement('canvas');label.width=1024;label.height=600;const c=label.getContext('2d');
 c.fillStyle='#f3e8d0';c.fillRect(0,0,1024,600);
 const stickerTexture=new THREE.CanvasTexture(label);stickerTexture.colorSpace=THREE.SRGBColorSpace;stickerTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const sticker=box(1.38,.81,.012,-1.12,-1.27,.185,new THREE.MeshBasicMaterial({map:stickerTexture,toneMapped:false}),.025);sticker.rotation.z=.045;
 // Opaque paper back keeps the underside from showing mirrored front printing.
 const paperBack=box(1.38,.81,.003,-1.12,-1.27,.176,new THREE.MeshBasicMaterial({color:0xe1d7c1}),.001);paperBack.rotation.z=.045;
 model.updateMatrixWorld(true);lid.attach(sticker);lid.attach(paperBack);
 let alive=true;
 // HDR affects lighting only. Keep scene.background=null to show the webpage.
 new HDRLoader().load('/movies/studio_small_09_1k.hdr', hdr => {
  if(!alive){hdr.dispose();return;}
  hdr.mapping=THREE.EquirectangularReflectionMapping;
  const generator=new THREE.PMREMGenerator(renderer);
  const next=generator.fromEquirectangular(hdr);
  reflectionTarget.fromEquirectangularTexture(renderer,hdr);
  scene.environment=next.texture;
  environment.dispose();environment=next;
  generator.dispose();hdr.dispose();
 },undefined,error=>console.warn('Studio HDR unavailable; using procedural studio.',error));
 let artworkRequest=0;
 let pendingImage=null;
 function fittedText(ctx,text,x,y,maxWidth,size,weight='bold'){
  ctx.font=`${weight} ${size}px Arial`;
  while(ctx.measureText(text).width>maxWidth && size>12){size-=2;ctx.font=`${weight} ${size}px Arial`;}
  ctx.fillText(text,x,y,maxWidth);
 }
 function setMovie(movie){
  const info=movieLabel(movie);const request=++artworkRequest;
  if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;pendingImage=null;}
  c.textAlign='left';c.fillStyle='#f3e8d0';c.fillRect(0,0,1024,600);c.fillStyle='#171918';
  fittedText(c,info.title.toUpperCase(),40,125,944,105);
  c.fillRect(40,151,944,5);fittedText(c,`YEAR: ${info.year}     RUNTIME: ${info.runtime}`,40,215,944,43);
  c.fillRect(40,243,944,4);fittedText(c,`DIRECTOR: ${info.director.toUpperCase()}`,40,301,944,39);
  for(let i=0;i<110;i++){const digit=Number(info.inventory[i%info.inventory.length])||0;c.fillRect(42+i*8.5,340,2+(digit+i)%5,155);}
  c.font='36px monospace';c.textAlign='center';c.fillText(info.inventory,512,555);stickerTexture.needsUpdate=true;
  function paintArtwork(img){
   if(!alive||request!==artworkRequest)return;
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d');
   ctx.fillStyle='#28313b';ctx.fillRect(0,0,1024,1024);
   if(img){const side=Math.min(img.naturalWidth,img.naturalHeight);ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)*.3,side,side,0,0,1024,1024);}
   const shade=ctx.createLinearGradient(0,0,0,400);shade.addColorStop(0,'rgba(0,0,0,.85)');shade.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shade;ctx.fillRect(0,0,1024,400);
   ctx.fillStyle='#fff3e5';ctx.textAlign='center';fittedText(ctx,info.title,512,230,740,62);ctx.font='28px Arial';ctx.fillText(info.year,512,282);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
   disc.material.map?.dispose();disc.material.map=texture;disc.material.color.set(0xffffff);disc.material.needsUpdate=true;
  }
  paintArtwork(null);
  function loadArt(index){
   if(!alive||request!==artworkRequest||index>=info.artwork.length)return;
   const img=new Image();pendingImage=img;img.crossOrigin='anonymous';
   img.onload=()=>{if(request!==artworkRequest||!alive)return;pendingImage=null;paintArtwork(img);};
   img.onerror=()=>{if(request!==artworkRequest||!alive)return;pendingImage=null;loadArt(index+1);};
   img.src=info.artwork[index];
  }
  loadArt(0);
 }
 let targetX=-.08,targetY=-.25,frameId=0,visible=true,openTarget=0,openAmount=0;
 const fitBox=new THREE.Box3();const fitCenter=new THREE.Vector3();const fitSize=new THREE.Vector3();
 const fitBounds=new THREE.Box3(new THREE.Vector3(-2.25,-1.97,-.15),new THREE.Vector3(2.25,1.97,.2));
 const lidBounds=fitBounds.clone();const movingBounds=new THREE.Box3();
 const discBounds=new THREE.Box3(new THREE.Vector3(-1.80,-1.80,-.025),new THREE.Vector3(1.80,1.80,.035));
 disc.castShadow=true;sticker.castShadow=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=camera.aspect<1?12:9;camera.updateProjectionMatrix();});resize.observe(host);
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible&&!frameId)draw();});observer.observe(host);
 function draw(){frameId=0;if(!alive||!visible)return;const t=reduced.matches?1:.12;model.rotation.x+=(targetX-model.rotation.x)*t;model.rotation.y+=(targetY-model.rotation.y)*t; openAmount+=(openTarget-openAmount)*(reduced.matches?1:.09);
 hingePivot.rotation.y=-openAmount*Math.PI*.83;
 // Wait for the lid to clear the disc. The same curve seats it before closing.
 const liftT=THREE.MathUtils.clamp((openAmount-.55)/.45,0,1);
 const lift=liftT*liftT*(3-2*liftT);
 floatingDisc.position.z=.68*lift;
 floatingDisc.position.y=.12*lift;
 floatingDisc.scale.setScalar(1+.10*lift);
 floatingDisc.rotation.x=-.07*lift;
 floatingDisc.rotation.y=.05*lift;
 model.position.x=0;
 model.updateMatrixWorld(true);
 // Fit both shells using transformed bounds at every angle, including narrow screens.
 fitBox.copy(fitBounds).applyMatrix4(model.matrixWorld);
 movingBounds.copy(lidBounds).applyMatrix4(lid.matrixWorld);fitBox.union(movingBounds);
 movingBounds.copy(discBounds).applyMatrix4(floatingDisc.matrixWorld);fitBox.union(movingBounds);
 fitBox.getCenter(fitCenter);fitBox.getSize(fitSize);
 const distance=Math.max(fitSize.y,fitSize.x/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.13+fitSize.z*.5;
 camera.position.set(fitCenter.x,fitCenter.y,fitCenter.z+distance);camera.lookAt(fitCenter);
caseInverse.copy(model.matrixWorld).invert();renderer.render(scene,camera);frameId=requestAnimationFrame(draw);}
 draw();
 return { setMovie, setOpen(value){openTarget=value?1:0;}, rotate(x,y){targetX=Math.max(-.75,Math.min(.75,x));targetY=Math.max(-1.2,Math.min(1.2,y));}, reset(){targetX=-.08;targetY=-.25;}, dispose(){alive=false;cancelAnimationFrame(frameId);resize.disconnect();observer.disconnect();artworkRequest++;if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;}const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const m of materials){if(m.map)textures.add(m.map);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());environment.dispose();reflectionTarget.dispose();receiver.geometry.dispose();receiver.material.dispose();key.shadow.dispose();renderer.dispose();renderer.domElement.remove();} };
}
