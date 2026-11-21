import signatureFontUrl from '$lib/assets/fonts/Clarity-Signature-BF6aa5046924898.otf?url';
import { movieLabel } from './movieLabel.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildJewelGeometry } from './jewelGeometry.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


// Every structural part is actual geometry. Only the printed label uses an image.
export async function createJewelScene(host) {
 let titleFont='cursive';
 try {
  if(!Array.from(document.fonts).some(face=>face.family==='Jewel Clarity Signature' && face.status==='loaded')){
   const face=await new FontFace('Jewel Clarity Signature',`url(${signatureFontUrl})`).load();document.fonts.add(face);
  }
  titleFont='"Jewel Clarity Signature"';
 }catch(error){console.warn('Signature font unavailable; using cursive fallback.',error);}
 let imported=null;
 try { imported=(await new GLTFLoader().loadAsync('/movies/jewel-case.glb')).scene; }
 catch(error){ console.warn('Using procedural case fallback',error); }
 const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
 renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio, 1.5), 2));
 renderer.toneMapping = THREE.NeutralToneMapping;
 renderer.toneMappingExposure = 1;
 renderer.transmissionResolutionScale = 1;
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 host.appendChild(renderer.domElement);
 renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
 const scene = new THREE.Scene();
 scene.background = null;
 renderer.setClearColor(0x000000, 0);
 const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
 camera.position.set(0, 0, 10);
 const pmrem = new THREE.PMREMGenerator(renderer);
 // Broad, dimmer softboxes and prefiltered HDR lighting soften reflections.
 const studio = new THREE.Scene();
 studio.background = new THREE.Color(0x303741);
 function softbox(w,h,x,y,z,intensity) {
  const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity),side:THREE.DoubleSide}));
  card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
 }
 softbox(2.4,7,-3,1,3,2.8);softbox(1.8,6,4,0,2,2.2);
 softbox(5,2,0,4,2,2.8);softbox(3,1.2,-1,-3,3,1.8);
 softbox(3,5,-4,0,-2,1.8);
 let environment = pmrem.fromScene(studio, .10);
 // Gentle illumination and polished reflections need separate filtering.
 let polishedEnvironment = pmrem.fromScene(studio, .008);
 scene.environment = environment.texture;
 studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe1eeff, 0x171921, .35));
 const key = new THREE.DirectionalLight(0xffffff, .65);key.position.set(-3,5,5);scene.add(key);
 const rim = new THREE.DirectionalLight(0xc5dfff,.35);rim.position.set(4,2,-2);scene.add(rim);
 // A pale red accent adds warmth to the disc and clear case alongside the studio lights.
 const redAccent = new THREE.DirectionalLight(0xffa3a3, .55);
 redAccent.position.set(3, 1, 4);scene.add(redAccent);
 const model = new THREE.Group(); scene.add(model);
 // Physical dielectric response: transmission preserves reflection energy instead
 // of compositing a white reflection as opacity over the artwork.
 const transmissionCapture = new THREE.WebGLRenderTarget(1,1,{
  type:THREE.HalfFloatType, samples:4, generateMipmaps:true,
  minFilter:THREE.LinearMipmapLinearFilter
 });
 const lidCapture=transmissionCapture.clone();
 const captureSize=new THREE.Vector2();
 const transmissiveParts=[];
 function clearSurface(thickness, roughness, capture=transmissionCapture) {
  const material = new THREE.MeshPhysicalMaterial({
   name:'pale blue glass', color:0xeaf5ff, metalness:0,
   roughness, transmission:1, opacity:1, transparent:false,
   ior:1.59, thickness, dispersion:.16,
   attenuationColor:new THREE.Color(0xc9e7ff), attenuationDistance:2,
   specularIntensity:1, envMapIntensity:.55, envMap:polishedEnvironment.texture,
   side:THREE.FrontSide, depthWrite:true
  });
  material.onBeforeCompile=shader=>{
   shader.uniforms.jewelTransmissionMap={value:capture.texture};
   shader.uniforms.jewelTransmissionSize={value:captureSize};
   shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_pars_fragment>',
    THREE.ShaderChunk.transmission_pars_fragment.replaceAll('transmissionSamplerMap','jewelTransmissionMap').replaceAll('transmissionSamplerSize','jewelTransmissionSize'));
   // Reflection energy must have matching canvas coverage over a CSS backdrop.
   shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`
    #include <dithering_fragment>
    gl_FragColor.rgb=clamp(gl_FragColor.rgb,0.0,1.0);
    gl_FragColor.a=max(gl_FragColor.a,max(gl_FragColor.r,max(gl_FragColor.g,gl_FragColor.b)));
   `);
  };
  material.customProgramCacheKey=()=> 'jewel-transparent-transmission-v1';
  return material;
 }
 const glass = clearSurface(.025,.012);
 const edge = clearSurface(.06,.022);
 const moulding = clearSurface(.04,.035);
 const silver = new THREE.MeshPhysicalMaterial({ color: 0xb8c1cc, metalness: 1, roughness: .24, iridescence: .6, iridescenceIOR: 1.3, iridescenceThicknessRange: [180,380] });
 function mesh(geometry, material, x=0,y=0,z=0) { const obj=new THREE.Mesh(geometry,material); obj.position.set(x,y,z);model.add(obj);return obj; }
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
   const object=new THREE.Mesh(geometry,material);object.name=o.name;
   groups[part].add(object);o.geometry.dispose();sourceMaterials.add(o.material);
  });
  // Batch real corrugations per moving part, preserving their bevels and depth.
  for(const group of Object.values(groups)){
   const ribs=group.children.filter(o=>o.name.includes('microflutes'));
   if(!ribs.length)continue;
   const combined=mergeGeometries(ribs.map(o=>o.geometry));
   if(combined){const mesh=new THREE.Mesh(combined,edge);mesh.name='full depth corrugations';group.add(mesh);
    for(const rib of ribs){group.remove(rib);rib.geometry.dispose();}}
  }
  sourceMaterials.forEach(m=>m.dispose());
 }else assembly=buildJewelGeometry({glass,edge,moulding});
 model.add(assembly);
 const lid=assembly.getObjectByName('front-lid');
 const lidMaterials=new Map();
 lid.traverse(o=>{if(o.isMesh){
  if(!lidMaterials.has(o.material))lidMaterials.set(o.material,clearSurface(o.material.thickness,o.material.roughness,lidCapture));
  o.material=lidMaterials.get(o.material);
 }});
 const hingePivot=new THREE.Group();hingePivot.name='working spine pivot';hingePivot.position.set(-2.135,0,-.006);model.add(hingePivot);
 model.updateMatrixWorld(true);hingePivot.attach(lid);
 // Bright physical hinge hardware makes the fitted pivot legible under HDR light.
 const hingeMaterial=clearSurface(.045,.025);
 assembly.getObjectByName('hinges').traverse(o=>{if(o.isMesh){o.material=hingeMaterial;o.castShadow=false;}});
 assembly.getObjectByName('spring-hub').traverse(o=>{if(o.isMesh){o.material=hingeMaterial;o.castShadow=false;}});
 // Local ambient-occlusion approximation at the seat and centre contact areas.
 // Soft annular gradients are attached to the tray, not to the opening lid.
 function contactRing(inner,outer,z,strength){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
   uniforms:{inner:{value:inner},outer:{value:outer},strength:{value:strength}},
   vertexShader:'varying vec2 q;void main(){q=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'varying vec2 q;uniform float inner;uniform float outer;uniform float strength;void main(){float r=length(q);float t=clamp((r-inner)/(outer-inner),0.0,1.0);gl_FragColor=vec4(0.015,0.02,0.025,strength*sin(t*3.14159265));}' });
  const ring=mesh(new THREE.RingGeometry(inner,outer,128),material,.12,0,z);
 }
 contactRing(1.76,1.86,-.012,.38);contactRing(.15,.38,.028,.25);
 const discX=.12;
 const discProfile=[new THREE.Vector2(.35,-.018),new THREE.Vector2(1.778,-.018),new THREE.Vector2(1.78,-.013),new THREE.Vector2(1.78,.022),new THREE.Vector2(1.776,.025),new THREE.Vector2(.35,.025),new THREE.Vector2(.35,-.018)];
 const discBody=mesh(new THREE.LatheGeometry(discProfile,256),silver,discX,0,0);discBody.rotation.x=Math.PI/2;

 const disc=mesh(new THREE.RingGeometry(.51,1.755,256),new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.48,metalness:.04,clearcoat:.38,clearcoatRoughness:.3,iridescence:.08,iridescenceIOR:1.45,iridescenceThicknessRange:[180,420],envMapIntensity:.4,side:THREE.FrontSide}),discX,0,.028);
 // Fine concentric machining, with mipmaps to keep distant grooves stable.
 const brushSize=1024,brushData=new Uint8Array(brushSize*brushSize*4);
 for(let y=0;y<brushSize;y++)for(let x=0;x<brushSize;x++){
  const r=Math.hypot(x-brushSize/2,y-brushSize/2);
  const grain=.5+.22*Math.sin(r*2.1)+.12*Math.sin(r*3.7);
  const i=(y*brushSize+x)*4;brushData[i]=brushData[i+1]=brushData[i+2]=Math.round(grain*255);brushData[i+3]=255;
 }
 const brush=new THREE.DataTexture(brushData,brushSize,brushSize);
 brush.generateMipmaps=true;brush.minFilter=THREE.LinearMipmapLinearFilter;brush.magFilter=THREE.LinearFilter;
 brush.anisotropy=renderer.capabilities.getMaxAnisotropy();brush.needsUpdate=true;
 disc.material.bumpMap=brush;disc.material.bumpScale=.00022;
 // Radial diffraction tint follows the viewing angle and disc azimuth.
 // Apply to the printed disc shader, so the effect stays on its actual surface.
 const discCameraLocal=new THREE.Vector3();
 const discWorldInverse=new THREE.Matrix4();
 disc.material.onBeforeCompile=shader=>{
  shader.uniforms.discCameraLocal={value:discCameraLocal};
  shader.vertexShader='uniform vec3 discCameraLocal; varying vec3 discLocalView; varying vec2 discCoordinates;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n discCoordinates=position.xy; discLocalView=discCameraLocal-position;');
  shader.fragmentShader='varying vec3 discLocalView; varying vec2 discCoordinates;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
   #include <emissivemap_fragment>
   float radius=length(discCoordinates);
   vec3 eye=normalize(discLocalView);
   vec2 radial=normalize(discCoordinates);
   vec2 projected=eye.xy;
   float projectedLength=length(projected);
   vec2 lightDirection=projectedLength>0.0001?projected/projectedLength:vec2(1.0,0.0);
   float alignment=dot(radial,lightDirection);
   float tilt=1.0-abs(eye.z);
   float fan=pow(abs(alignment),12.0)*smoothstep(0.0,.025,projectedLength);
   vec3 spectrum=.5+.5*cos(6.2831853*(radius*.48+alignment*.30+tilt*.4)+vec3(0.0,2.094,4.188));
   float mask=smoothstep(.37,.55,radius)*(1.0-smoothstep(1.72,1.78,radius));

  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`
   #include <lights_fragment_end>
   vec3 spectralTint=mix(vec3(1.0),spectrum*1.6,fan*mask*.16);
   reflectedLight.indirectSpecular*=spectralTint;
   reflectedLight.directSpecular*=spectralTint;
  `);
 };
 disc.material.customProgramCacheKey=()=> 'disc-printed-reflected-spectrum-v4';
 // Planar UVs across the disc, rather than the polar UVs of RingGeometry.
 const pos=disc.geometry.attributes.position,uv=disc.geometry.attributes.uv;
 for(let i=0;i<pos.count;i++) uv.setXY(i,pos.getX(i)/3.56+.5,pos.getY(i)/3.56+.5);
 // Exposed metal and concentric moulded rings read separately from printed ink.
 const discRim=mesh(new THREE.TorusGeometry(1.776,.006,12,256),silver,discX,0,.019);
 const hubPlastic=new THREE.MeshPhysicalMaterial({color:0xc6cbd0,metalness:.12,roughness:.2,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.65});
 const hubMirror=new THREE.MeshPhysicalMaterial({color:0xd2d6da,metalness:.9,roughness:.19,envMapIntensity:.8,iridescence:.25,iridescenceThicknessRange:[220,340]});
 const hubWindow=mesh(new THREE.RingGeometry(.35,.465,256),hubPlastic,discX,0,.028);
 const hubBand=mesh(new THREE.RingGeometry(.465,.51,256),hubMirror,discX,0,.029);
 const hubInnerLip=mesh(new THREE.TorusGeometry(.353,.005,10,256),hubPlastic,discX,0,.03);
 const hubOuterLip=mesh(new THREE.TorusGeometry(.49,.003,8,256),hubPlastic,discX,0,.032);
 // Move the whole physical disc together, leaving the spindle in the tray.
 const floatingDisc=new THREE.Group();floatingDisc.name='lift-out disc';floatingDisc.position.set(discX,0,0);model.add(floatingDisc);
 model.updateMatrixWorld(true);
 for(const part of [discBody,disc,discRim,hubWindow,hubBand,hubInnerLip,hubOuterLip])floatingDisc.attach(part);
 const label=document.createElement('canvas');label.width=2048;label.height=1200;const c=label.getContext('2d');c.scale(2,2);
 const paper=document.createElement('canvas');paper.width=1024;paper.height=600;
 const pc=paper.getContext('2d');let seed=41;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const grain=pc.createImageData(1024,600);
 for(let i=0;i<grain.data.length;i+=4){const v=(random()-.5)*6;grain.data[i]=243+v;grain.data[i+1]=233+v;grain.data[i+2]=213+v;grain.data[i+3]=255;}
 pc.putImageData(grain,0,0);pc.lineWidth=.55;
 for(let i=0;i<9000;i++){const x=random()*1024,y=random()*600;pc.strokeStyle=random()>.5?'rgba(255,255,247,.19)':'rgba(116,100,73,.09)';pc.beginPath();pc.moveTo(x,y);pc.quadraticCurveTo(x+2,y-1,x+2+random()*7,y+(random()-.5)*3);pc.stroke();}
 c.drawImage(paper,0,0);
 const paperBump=new THREE.CanvasTexture(paper);
 const paperColour=new THREE.CanvasTexture(paper);paperColour.colorSpace=THREE.SRGBColorSpace;paperColour.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const stickerTexture=new THREE.CanvasTexture(label);stickerTexture.colorSpace=THREE.SRGBColorSpace;stickerTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const sticker=box(1.38,.81,.012,-1.12,-1.27,.185,new THREE.MeshStandardMaterial({map:stickerTexture,roughness:.94,metalness:0,bumpMap:paperBump,bumpScale:.00035,envMapIntensity:.45,emissiveMap:stickerTexture,emissive:0xffffff,emissiveIntensity:.22}),.025);sticker.rotation.z=.045;
 // Opaque paper back keeps the underside from showing mirrored front printing.
 const paperBack=box(1.38,.81,.003,-1.12,-1.27,.176,new THREE.MeshStandardMaterial({map:paperColour,bumpMap:paperBump,bumpScale:.00035,roughness:.94,metalness:0,envMapIntensity:.45}),.001);paperBack.rotation.z=.045;
 model.updateMatrixWorld(true);lid.attach(sticker);lid.attach(paperBack);
 let alive=true;
 // HDR affects lighting only. Keep scene.background=null to show the webpage.
 new HDRLoader().load('/movies/studio_small_09_2k.hdr', hdr => {
  if(!alive){hdr.dispose();return;}
  hdr.mapping=THREE.EquirectangularReflectionMapping;
  const generator=new THREE.PMREMGenerator(renderer);
  const lightingScene=new THREE.Scene();lightingScene.background=hdr;
  // Blur illumination, not the transmitted movie artwork. Sigma is in radians.
  const next=generator.fromScene(lightingScene,.10);
  const nextPolished=generator.fromEquirectangular(hdr);
  model.traverse(o=>{if(o.isMesh && o.material.transmission>0){
   o.material.envMap=nextPolished.texture;o.material.needsUpdate=true;
  }});
  polishedEnvironment.dispose();polishedEnvironment=nextPolished;
  scene.environment=next.texture;
  environment.dispose();environment=next;
  generator.dispose();hdr.dispose();
 },undefined,error=>console.warn('Studio HDR unavailable; using procedural studio.',error));
 let artworkRequest=0;
 let pendingImage=null;
 function fittedText(ctx,text,x,y,maxWidth,size,weight='bold',family='Arial'){
  ctx.font=`${weight} ${size}px ${family}`;
  while(ctx.measureText(text).width>maxWidth && size>12){size-=2;ctx.font=`${weight} ${size}px ${family}`;}
  ctx.fillText(text,x,y,maxWidth);
 }
 function setMovie(movie){
  const info=movieLabel(movie);const request=++artworkRequest;
  if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;pendingImage=null;}
  c.textAlign='left';c.drawImage(paper,0,0);c.fillStyle='#171918';
  fittedText(c,info.title,48,117,928,144,'normal',titleFont);
  c.strokeStyle='#171918';c.lineWidth=.65;c.strokeText(info.title,48,117,928);
  c.fillRect(40,151,944,5);fittedText(c,`YEAR: ${info.year}     RUNTIME: ${info.runtime}`,40,215,944,43);
  c.fillRect(40,243,944,4);fittedText(c,`DIRECTOR: ${info.director.toUpperCase()}`,40,301,944,39);
  for(let i=0;i<110;i++){const digit=Number(info.inventory[i%info.inventory.length])||0;c.fillRect(42+i*8.5,340,2+(digit+i)%5,155);}
  c.font='36px monospace';c.textAlign='center';c.fillText(info.inventory,512,555);stickerTexture.needsUpdate=true;
  function paintArtwork(img){
   if(!alive||request!==artworkRequest)return;
   const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.fillStyle='#28313b';ctx.fillRect(0,0,1024,1024);
   if(img){
    // Cover the image area directly from the original, without a low-res intermediate.
    const ratio=1024/756;
    const width=Math.min(img.naturalWidth,img.naturalHeight*ratio),height=width/ratio;
    ctx.drawImage(img,(img.naturalWidth-width)/2,(img.naturalHeight-height)*.3,width,height,0,0,1024,756);
   }
   ctx.fillStyle='#e4dfd3';ctx.fillRect(0,756,1024,268);
   // Subtle deterministic ink/paper variation, not a coarse machining texture.
   let grainSeed=31;
   for(let i=0;i<16000;i++){
    grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;const x=grainSeed/4294967296*1024;
    grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;const y=756+grainSeed/4294967296*268;
    ctx.fillStyle=i%2?'rgba(255,255,255,.09)':'rgba(50,40,30,.035)';ctx.fillRect(x,y,.7,.7);
   }
   ctx.fillStyle='#242320';ctx.textAlign='center';
   fittedText(ctx,info.title,512,836,690,76,'normal',titleFont);
   ctx.fillStyle='#666257';fittedText(ctx,info.director,512,882,550,22,'normal');
   ctx.font='18px Arial';ctx.fillText(`${info.year}  /  ${info.runtime}`,512,916);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
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
 let spin=0,lastFrameTime=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=camera.aspect<1?12:9;camera.updateProjectionMatrix();});resize.observe(host);
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible)lastFrameTime=0;if(visible&&!frameId)draw();});observer.observe(host);
 function draw(){frameId=0;if(!alive||!visible)return;
 const now=performance.now();const dt=lastFrameTime?Math.min((now-lastFrameTime)/1000,.05):0;lastFrameTime=now;
 if(reduced.matches){spin=0;}
 else if(!openTarget && openAmount<.01){spin=THREE.MathUtils.euclideanModulo(spin-dt*Math.PI*2/90+Math.PI,Math.PI*2)-Math.PI;}
 else {spin*=Math.exp(-dt*4);}
 floatingDisc.rotation.z=spin;
const t=reduced.matches?1:.12;model.rotation.x+=(targetX-.32*openAmount-model.rotation.x)*t;model.rotation.y+=(targetY-model.rotation.y)*t; openAmount+=(openTarget-openAmount)*(reduced.matches?1:.09);
 hingePivot.rotation.y=-openAmount*Math.PI*.83;
 // Wait for the lid to clear the disc. The same curve seats it before closing.
 const liftT=THREE.MathUtils.clamp((openAmount-.55)/.45,0,1);
 const lift=liftT*liftT*(3-2*liftT);
 floatingDisc.position.z=.58*lift;
 floatingDisc.position.y=.12*lift;
 floatingDisc.scale.setScalar(1);
 // Slightly steeper pop-up, with enough lift to clear the tray.
 floatingDisc.rotation.x=.30*lift;
 floatingDisc.rotation.y=.12*lift;
 model.position.x=0;
 model.updateMatrixWorld(true);
 // Fit both shells using transformed bounds at every angle, including narrow screens.
 fitBox.copy(fitBounds).applyMatrix4(model.matrixWorld);
 movingBounds.copy(lidBounds).applyMatrix4(lid.matrixWorld);fitBox.union(movingBounds);
 movingBounds.copy(discBounds).applyMatrix4(floatingDisc.matrixWorld);fitBox.union(movingBounds);
 fitBox.getCenter(fitCenter);fitBox.getSize(fitSize);
 const distance=Math.max(fitSize.y,fitSize.x/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.13+fitSize.z*.5;
 camera.position.set(fitCenter.x,fitCenter.y,fitCenter.z+distance);camera.lookAt(fitCenter);
discWorldInverse.copy(disc.matrixWorld).invert();discCameraLocal.copy(camera.position).applyMatrix4(discWorldInverse);
renderer.getDrawingBufferSize(captureSize);
 if(transmissionCapture.width!==captureSize.x||transmissionCapture.height!==captureSize.y){transmissionCapture.setSize(captureSize.x,captureSize.y);lidCapture.setSize(captureSize.x,captureSize.y);}
 transmissiveParts.length=0;
 model.traverse(o=>{if(o.isMesh&&o.visible&&o.material.transmission>0){transmissiveParts.push(o);o.visible=false;}});
 const savedToneMapping=renderer.toneMapping;renderer.toneMapping=THREE.NoToneMapping;
 renderer.setRenderTarget(transmissionCapture);renderer.render(scene,camera);
 for(const o of transmissiveParts)o.visible=true;
 // Resolve the tray, ribs and hub first; the lid then refracts this assembled view.
 lid.visible=false;
 renderer.setRenderTarget(lidCapture);renderer.render(scene,camera);
 lid.visible=true;
 renderer.setRenderTarget(null);renderer.toneMapping=savedToneMapping;
 renderer.render(scene,camera);frameId=requestAnimationFrame(draw);}
 draw();
 return { setMovie, setOpen(value){openTarget=value?1:0;}, rotate(x,y){targetX=Math.max(-.75,Math.min(.75,x));targetY=Math.max(-1.2,Math.min(1.2,y));}, reset(){targetX=-.08;targetY=-.25;}, dispose(){alive=false;cancelAnimationFrame(frameId);resize.disconnect();observer.disconnect();artworkRequest++;if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;}const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const m of materials){if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());environment.dispose();polishedEnvironment.dispose();transmissionCapture.dispose();lidCapture.dispose();renderer.dispose();renderer.domElement.remove();} };
}
