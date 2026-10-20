import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { pointOnFeature } from '@turf/point-on-feature';
import type { Region, RegionFeature } from './types';
export type Collection = FeatureCollection<Polygon | MultiPolygon, Region> & {atlasCoverage?:{snapshot:string;available:number;expected:number;partial:boolean;derived:boolean}};
export type BoundaryOptions = {chinaExternal?:boolean};
const base=import.meta.env.BASE_URL;
const pending=new Map<string,Promise<Collection>>();
export function normalize(s:string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s’'·-]/g,''); }
export function matches(r:Region,q:string) { return [r.name,...r.aliases].some(n=>normalize(n).includes(normalize(q))); }
async function json(url:string) {const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`Boundary request failed (${r.status})`);return r.json();}
export async function world():Promise<Collection>{return json(base+'data/world.json');}
export async function children(parent:RegionFeature,options:BoundaryOptions={}):Promise<Collection> {
 const r=parent.properties;
 const key=r.id+(options.chinaExternal?':external':':local');
 if(pending.has(key))return pending.get(key)!;
 const task=loadChildren(parent,options);pending.set(key,task);try{return await task;}catch(e){pending.delete(key);throw e;}
}
async function loadChildren(parent:RegionFeature,options:BoundaryOptions):Promise<Collection>{
 const r=parent.properties;
 if(r.id==='WORLD:276'||r.id.startsWith('DE:')) {
  if(r.level>=3)return {type:'FeatureCollection',features:[]};
  return json(base+'data/'+r.id.replace(':','-')+'.json');
 }
 if(r.id==='WORLD:156'||r.id.startsWith('CN:')) {
  if(r.level>=3)return {type:'FeatureCollection',features:[]};
  if(!options.chinaExternal){
   try{
    if(r.id!=='WORLD:156'&&!/^CN:\d{6}$/.test(r.id))throw new Error('Invalid China region ID');
    const fc=await json(base+'data/china/'+r.id.replace(':','-')+'.json') as Collection;
    if(fc.type!=='FeatureCollection'||!Array.isArray(fc.features)||!fc.features.length||!fc.atlasCoverage||fc.atlasCoverage.available!==fc.features.length||fc.features.some(f=>f.type!=='Feature'||!f.properties||f.properties.id===r.id||!/^CN:\d{6}$/.test(f.properties.id)||f.properties.country!=='CHN'||f.properties.parent!==r.id||!Number.isInteger(f.properties.level)||f.properties.level<=r.level||f.properties.level>3||JSON.stringify(f.properties.ancestors)!==JSON.stringify([...r.ancestors,r.id])||!['Polygon','MultiPolygon'].includes(f.geometry?.type))||new Set(fc.features.map(f=>f.properties.id)).size!==fc.features.length)throw new Error('Invalid China child hierarchy');
    return fc;
   }catch{throw new Error('Local China snapshot unavailable or invalid. Use the External snapshot button to try the boundary providers.');}
  }
  const code=r.id==='WORLD:156'?'100000':r.id.split(':')[1];
  function validate(raw:any){
   if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))throw new Error('Invalid China boundary collection');
   const features=raw.features.filter((f:any)=>f?.properties?.name&&/^\d{6}$/.test(String(f.properties.adcode))&&['Polygon','MultiPolygon'].includes(f.geometry?.type));
   const expectedLevel=(p:any)=>p.level==='province'?1:p.level==='city'?2:p.level==='district'?3:0;
   if(!features.length||features.some((f:any)=>String(f.properties.adcode)===code||expectedLevel(f.properties)<=r.level||Number(f.properties.parent?.adcode)!==Number(code)))throw new Error('Boundary source returned the parent or an unrelated administrative level');
   return {...raw,features};
  }
  let raw;
  try {raw=validate(await json(`https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`));}
  catch {const fallback=code==='100000'?'https://raw.githubusercontent.com/Civitasv/DataV_GeoJSON/master/geojson_full/100000_full.json':`https://raw.githubusercontent.com/zhChuXiao/ChinaGeoJson/master/${Number(code)%10000===0?'province':'citys'}/${encodeURIComponent(r.name)}.json`;raw=validate(await json(fallback));}
  const {pinyin}=await import('pinyin-pro');
  return {type:'FeatureCollection',features:raw.features.filter((f:any)=>f.properties.name&&f.geometry&&f.properties.adcode).map((f:any)=>{
   const p=f.properties;const level=p.level==='district'?3:p.level==='city'?2:1;
   const ancestors=[...r.ancestors,r.id];
   return {...f,properties:{id:`CN:${p.adcode}`,name:p.name,aliases:[pinyin(p.name,{toneType:'none'})],country:'CHN',level,parent:r.id,ancestors,source:'Alibaba DataV.GeoAtlas (third-party snapshot)',...(p.childrenNum?{childKey:`CN:${p.adcode}`}:{})}};
  })};
 }
 // Global fallback: load just the requested country/administrative level, never the world dataset.
 const iso=r.iso3||r.country;const level=r.level+1;if(level>5)return {type:'FeatureCollection',features:[]};
 const metadata=await json(`https://www.geoboundaries.org/api/current/gbOpen/${encodeURIComponent(iso)}/ADM${level}/`);
 if(!metadata.simplifiedGeometryGeoJSON)throw new Error('No boundary coverage at this level');
 const link=String(metadata.simplifiedGeometryGeoJSON).replace('https://github.com/wmgeolab/geoBoundaries/raw/','https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/');
 if(!link.startsWith('https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/'))throw new Error('Unsupported data source');
 const key=`${iso}:${level}`;let all=globalLayers.get(key);
 if(!all){const res=await fetch(link,{signal:AbortSignal.timeout(45000)});if(!res.ok)throw new Error('Boundary download unavailable');if(Number(res.headers.get('Content-Length'))>16_000_000)throw new Error('This boundary layer is too large for mobile; coverage unavailable');let size=0;const chunks:Uint8Array[]=[];const reader=res.body!.getReader();while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16_000_000){await reader.cancel();throw new Error('This boundary layer exceeds the 16 MB mobile limit');}chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}all=JSON.parse(new TextDecoder().decode(bytes));globalLayers.set(key,all!);}
 return {type:'FeatureCollection',features:all!.features.filter(f=>r.level===0||booleanPointInPolygon(pointOnFeature(f),parent)).map(f=>{
  const p=f.properties as any;const native=localName(String(p.shapeName));
  return {...f,properties:{id:`GB:${p.shapeID}`,name:native.name,aliases:native.aliases,country:iso,level,parent:r.id,ancestors:[...r.ancestors,r.id],source:`geoBoundaries ${metadata.boundaryID}; ${metadata.boundaryYearRepresented}; ${metadata.boundaryLicense}`,childKey:`GB:${p.shapeID}`}};
 })};
}
const globalLayers=new Map<string,Collection>();
function localName(name:string){if(/bolzano|bozen/i.test(name))return {name:'Bozen / Bolzano',aliases:[name,'Bozen','Bolzano','博尔扎诺']};return {name,aliases:[]};}
export async function searchIndex():Promise<Region[]> {return json(base+'data/search.json');}
export async function resolveRegion(target:Region,root:Collection,options:BoundaryOptions={}):Promise<{trail:RegionFeature[];collection:Collection;feature:RegionFeature}>{
 let collection=root;const trail:RegionFeature[]=[];
 for(const id of [...target.ancestors,target.id]){
  const feature=collection.features.find(f=>f.properties.id===id);if(!feature)throw new Error('Place unavailable in this boundary snapshot');
  if(id===target.id)return {trail,collection,feature};
  trail.push(feature);collection=await children(feature,options);
 }
 throw new Error('Place not found');
}
