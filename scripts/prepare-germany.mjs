import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { simplify } from '@turf/simplify';
import proj4 from 'proj4';
const fromCRS='+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs';
function wgs84(x){return typeof x[0]==='number'?proj4(fromCRS,'WGS84',x):x.map(wgs84);}
const base = new URL('../public/data/', import.meta.url); await mkdir(base,{recursive:true});
const cache=new URL('../.cache/',import.meta.url);await mkdir(cache,{recursive:true});
async function raw(file){const cached=new URL(file+'.geo.json',cache);try{return JSON.parse(await readFile(cached,'utf8'));}catch{}try{const contents=await readFile(new URL(`../../${file}.geo.json`,import.meta.url),'utf8');await writeFile(cached,contents);return JSON.parse(contents);}catch{}const response=await fetch(`https://raw.githubusercontent.com/juliuste/german-administrative-areas/c3670defbbff4f4281f0b88b601177cbba4bb850/${file}.geo.json`);if(!response.ok)throw new Error('German source download failed');const contents=await response.text();await writeFile(cached,contents);return JSON.parse(contents);}
const groups = new Map(); let counts=[];
function features(x){return Array.isArray(x)?x.flatMap(features):x.type==='FeatureCollection'?x.features.flatMap(features):[x];}
const aliases = {'Bayern':['Bavaria','巴伐利亚'], 'Nordrhein-Westfalen':['North Rhine-Westphalia','北莱茵-威斯特法伦','北威州'], 'München':['Munich','慕尼黑'], 'Dortmund':['多特蒙德'], 'Berlin':['柏林'], 'Hamburg':['汉堡'],'Köln':['Cologne','科隆'],'Frankfurt am Main':['Frankfurt','法兰克福']};
for (const [file,level,len] of [['laender',1,2],['kreise',2,5],['gemeinden',3,8]]) {
 const input=await raw(file);
 const seen=new Set();let count=0;
 for (const f of features(input)) {
  const p=f.properties;
  // BKG repeats marine areas with the same AGS; only terrestrial features form this atlas.
  if (Number(p.GF)!==4) continue;
  const code=String(p.AGS).padStart(len,'0'); const id=`DE:${code}`; if(seen.has(id)) throw new Error('Duplicate terrestrial AGS '+id);seen.add(id);
  const parent=level===1?'WORLD:276':`DE:${code.slice(0,level===2?2:5)}`;
  f.properties={id,name:p.GEN+(level===2&&p.BEZ==='Landkreis'?' (Landkreis)':''),aliases:aliases[p.GEN]||[],country:'DEU',level,parent,ancestors:['WORLD:276',...(level>1?[`DE:${code.slice(0,2)}`]:[]),...(level>2?[`DE:${code.slice(0,5)}`]:[])],source:'BKG VG250 via juliuste/german-administrative-areas (snapshot)',...(level<3?{childKey:id}:{})};
  f.geometry.coordinates=wgs84(f.geometry.coordinates);
  const small=simplify(f,{tolerance:level===1?0.003:level===2?0.0015:0.0006,highQuality:true});
  const round=(x)=>Array.isArray(x)?x.map(round):Math.round(x*1e5)/1e5;small.geometry.coordinates=round(small.geometry.coordinates);
  if(!groups.has(parent)) groups.set(parent,[]);groups.get(parent).push(small);count++;
 }
 counts.push({level,count});
}
for(const [key,features] of groups) await writeFile(new URL(key.replace(':','-')+'.json',base),JSON.stringify({type:'FeatureCollection',features}));
await writeFile(new URL('germany-manifest.json',base),JSON.stringify({counts,source:'https://github.com/juliuste/german-administrative-areas',license:'Data licence Germany attribution 2.0',warning:'Historical BKG snapshot; source repository deprecated. Not a current official registry.'}));console.log(counts,'parent bundles',groups.size);
