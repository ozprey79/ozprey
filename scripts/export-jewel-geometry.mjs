import fs from 'node:fs';
import * as T from 'three';
import {buildJewelGeometry} from '../src/routes/movies/jewelGeometry.js';
const materials={};for(const name of ['glass','edge','moulding']){materials[name]=new T.MeshBasicMaterial();materials[name].name=name;}
const root=buildJewelGeometry(materials);root.updateMatrixWorld(true);const items=[];
root.traverse(o=>{if(!o.isMesh)return;const count=o.isInstancedMesh?o.count:1;for(let n=0;n<count;n++){
 const m=o.matrixWorld.clone();if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(n,im);m.multiply(im);}
 const g=o.geometry.clone().applyMatrix4(m);const p=g.attributes.position;const vertices=[];
 for(let i=0;i<p.count;i++)vertices.push([p.getX(i),p.getY(i),p.getZ(i)]);
 const indices=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i);
 items.push({name:o.name+(count>1?'-'+n:''),part:o.parent.name,material:o.material.name,vertices,indices});g.dispose();
}});
fs.writeFileSync('.tmp/jewel-geometry.json',JSON.stringify(items));console.log(`${items.length} parts exported`);
