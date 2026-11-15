import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Dimensions in scene units. Separate fitted components, not decorative outlines.
export function buildJewelGeometry(materials) {
 const { glass, edge, moulding } = materials;
 const root = new THREE.Group(); root.name = 'Closed jewel case';
 const parts = {};
 for (const name of ['rear-shell','front-lid','disc-tray','hinges','spring-hub']) {
  parts[name] = new THREE.Group(); parts[name].name=name; root.add(parts[name]);
 }
 function add(part,name,geometry,material,x=0,y=0,z=0) {
  const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);
  m.renderOrder=part==='front-lid'?3:1;parts[part].add(m);return m;
 }
 function rounded(w,h,r) {
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
 }
 function solid(shape,depth,bevel=.004) {
  return new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:48,
   bevelEnabled:bevel>0,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel});
 }
 function panel(part,name,w,h,r,z,depth) {
  return add(part,name,solid(rounded(w,h,r),depth,.003),glass,0,0,z);
 }
 function frame(part,name,w,h,r,width,z,depth,material=edge) {
  const s=rounded(w,h,r);s.holes.push(new THREE.Path(rounded(w-2*width,h-2*width,Math.max(.012,r-width)).getPoints(48)));
  return add(part,name,solid(s,depth,.004),material,0,0,z);
 }
 function block(part,name,w,h,d,x,y,z,material=edge,r=.006) {
  return add(part,name,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),material,x,y,z);
 }
 // The rear pan has a floor, upright walls and a narrow mating ledge.
 panel('rear-shell','rear floor',4.43,3.88,.105,-.143,.022);
 frame('rear-shell','rear upright walls',4.45,3.9,.11,.034,-.12,.19);
 frame('rear-shell','rear inner mating rebate',4.365,3.815,.085,.018,.04,.025,moulding);
 // The lid is fitted around the rear wall, separated by a real seam.
 panel('front-lid','clear front window',4.42,3.87,.105,.148,.018);
 frame('front-lid','lid downward skirt',4.45,3.9,.11,.026,.077,.068);
 frame('front-lid','lid polished perimeter bevel',4.415,3.865,.10,.014,.145,.016);
 // An actual open spine channel, with end ribs; no filled solid spine slab.
 for(const x of [-2.055,-1.94])block('rear-shell','spine channel wall',.025,3.59,.18,x,0,-.025);
 for(const y of [-1.76,-1.64,1.64,1.76])block('rear-shell','spine end bridge',.15,.024,.14,-2,y,-.025);
 // Tray perimeter includes four semicircular finger-access cutouts.
 const tray=new THREE.Shape();const left=-1.87,right=2.10,top=1.79,bottom=-1.79;
 tray.moveTo(left,bottom);
 for(const cx of [-1.14,1.28]){
  tray.lineTo(cx-.18,bottom);
  tray.absarc(cx,bottom,.18,Math.PI,0,true);
 }
 tray.lineTo(right,bottom);tray.lineTo(right,top);
 for(const cx of [1.28,-1.14]){
  tray.lineTo(cx+.18,top);
  tray.absarc(cx,top,.18,0,-Math.PI,true);
 }
 tray.lineTo(left,top);tray.closePath();
 const wellHole=new THREE.Path();wellHole.absarc(.12,0,1.755,0,Math.PI*2,true);tray.holes.push(wellHole);
 add('disc-tray','tray corner webs with finger cutouts',solid(tray,.035,.006),moulding,0,0,-.072);
 // Revolved multi-step seat: floor -> curved ramp -> raised bead -> outer lip.
 function revolve(name,profile,part='disc-tray',x=.12,y=0) {
  const geometry=new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,z)),192);
  const obj=add(part,name,geometry,moulding,x,y,0);obj.rotation.x=Math.PI/2;return obj;
 }
 revolve('disc seat and rolled outer lip',[
  [.33,-.087],[1.735,-.087],[1.76,-.083],[1.78,-.066],[1.795,-.041],
  [1.806,-.026],[1.818,-.023],[1.829,-.031],[1.833,-.052],[1.833,-.082],
  [1.81,-.105],[.33,-.105],[.33,-.087]
 ]);
 // Finger cutout lips: half-annular walls, not complete decorative circles.
 for(const y of [-1.79,1.79])for(const x of [-1.14,1.28]) {
  const a=y>0?Math.PI:0;
  const shape=new THREE.Shape();shape.absarc(0,0,.186,a,a+Math.PI,false);
  shape.absarc(0,0,.16,a+Math.PI,a,true);shape.closePath();
  add('disc-tray','bevelled finger-access lip',solid(shape,.046,.004),edge,x,y,-.08);
 }
 // Buttress webs connect the seat to the tray corners.
 for(const sign of [-1,1])for(const x of [-1.78,1.99]) {
  const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(x<0?.22:-.22,-sign*.06);s.lineTo(0,-sign*.28);s.closePath();
  add('disc-tray','triangular tray brace',solid(s,.025,.003),moulding,x,sign*1.68,-.04);
 }
 // Centre hub: annular base and 12 individually separated, hooked spring fingers.
 revolve('hub annular foundation',[[.15,-.09],[.34,-.09],[.34,-.055],[.30,-.043],[.19,-.043],[.15,-.06],[.15,-.09]],'spring-hub');
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6;
  const s=new THREE.Shape();s.moveTo(.163,-.018);s.lineTo(.285,-.029);s.lineTo(.30,-.02);
  s.lineTo(.30,.02);s.lineTo(.285,.029);s.lineTo(.163,.018);s.closePath();
  const finger=add('spring-hub','separated spring finger '+i,solid(s,.035,.004),edge,.12,0,-.012);finger.rotation.z=angle;
  const lip=block('spring-hub','spring retaining hook '+i,.043,.036,.034,.12+Math.cos(angle)*.174,Math.sin(angle)*.174,.035,edge,.005);lip.rotation.z=angle;
 }
 // Two aligned hinge joints at the ends, with drilled ears and fitted pins.
 for(const sign of [-1,1]) {
  const ear=rounded(.16,.105,.025);const hole=new THREE.Path();hole.absarc(-.035,0,.019,0,Math.PI*2,true);ear.holes.push(hole);
  const joint=add('hinges','hinge ear with pivot bore',solid(ear,.022,.003),edge,-2.10,sign*1.81,-.006);
  joint.rotation.x=Math.PI/2;
  const pin=add('hinges','pivot pin',new THREE.CylinderGeometry(.016,.016,.052,32),moulding,-2.135,sign*1.81,-.006);
  for(const x of [-1.12,1.25]) {
   block('front-lid','booklet clip foot',.24,.035,.045,x,sign*1.82,.108);
   block('front-lid','booklet retaining tongue',.19,.085,.016,x,sign*1.765,.12);
  }
  for(const y of [.92,1.5])block('rear-shell','latch boss',.036,.10,.08,2.185,sign*y,.04);
 }
 // Sidewall fluting spans the thickness, with deliberate latch openings.
 // Pitch is ~0.65 mm at 14.2 cm overall width, not coarse top-surface teeth.
 const matrices=[];const matrix=new THREE.Matrix4();
 for(const sign of [-1,1])for(let i=0;i<197;i++){
  const x=-2.02+i*.0205;
  if([-1.12,1.25].some(cx=>Math.abs(x-cx)<.16))continue;
  matrix.makeTranslation(x,sign*1.953,.108);matrices.push(matrix.clone());
 }
 const ribs=new THREE.InstancedMesh(new RoundedBoxGeometry(.005,.007,.063,2,.0015),edge,matrices.length);
 ribs.name='vertical sidewall microflutes';ribs.renderOrder=3;
 matrices.forEach((m,i)=>ribs.setMatrixAt(i,m));parts['front-lid'].add(ribs);
 // Nested narrow rails form the long seam, stopping at the radiused corners.
 for(const sign of [-1,1]){
  for(const z of [.082,.141])block('front-lid','sidewall polished seam rail',4.14,.009,.008,0,sign*1.952,z,edge,.002);
  for(const x of [-1.12,1.25]){
   // Raised recess border and inset floor; ribbing leaves these bays clear.
   block('front-lid','latch recess sill',.28,.012,.012,x,sign*1.949,.086,edge,.003);
   for(const dx of [-.145,.145])block('front-lid','latch recess jamb',.012,.018,.056,x+dx,sign*1.942,.112,edge,.003);
   block('rear-shell','latch inset tongue',.24,.012,.018,x,sign*1.928,.102,moulding,.003);
  }
  // Four shallow stepped grooves at each end of the fluted edge.
  for(const x of [-2.10,2.10])for(let step=0;step<4;step++)
   block('front-lid','corner stepped moulding',.13,.008,.005,x,sign*1.94,.09+step*.014,edge,.0015);
 }
 root.userData.dimensionsCm=[14.2,1,12.5];
 return root;
}
