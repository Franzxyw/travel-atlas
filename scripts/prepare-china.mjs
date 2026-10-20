import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pinyin} from 'pinyin-pro';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
import {simplify} from '@turf/simplify';
import clipping from 'polygon-clipping';
import assert from 'node:assert/strict';

const output=new URL('../public/data/china/',import.meta.url);
const cache=new URL('../.cache/china/',import.meta.url);
await mkdir(output,{recursive:true});await mkdir(cache,{recursive:true});
const revision='9469f09';
const sources={
 provinces:{url:`https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${revision}/releaseData/gbOpen/CHN/ADM1/geoBoundaries-CHN-ADM1.geojson`,year:2019,license:'Public Domain',boundaryID:'CHN-ADM1-43563684'},
 counties:{url:`https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${revision}/releaseData/gbOpen/CHN/ADM3/geoBoundaries-CHN-ADM3_simplified.geojson`,year:2017,license:'ODbL-1.0',boundaryID:'CHN-ADM3-62558664'},
 names:{url:'https://raw.githubusercontent.com/zhChuXiao/ChinaGeoJson/7aa2c5fabc6a892015625898c3482874b233f9de/info.json',license:'MIT (name/code/parent/point catalog only; no DataV polygons)'}
};
async function get(key){const source=sources[key];const path=new URL(key+'.json',cache);let text;try{text=await readFile(path,'utf8');}catch{const r=await fetch(source.url);if(!r.ok)throw new Error(`Download failed: ${key} (${r.status})`);text=await r.text();await writeFile(path,text);}source.sha256=createHash('sha256').update(text).digest('hex');return JSON.parse(text);}
const [provinces,counties,catalog]=await Promise.all([get('provinces'),get('counties'),get('names')]);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
function nameKey(s){return normalize(/\p{Script=Han}/u.test(s)?pinyin(s.replace(/(自治县|自治旗|新区|林区|区|县|市|旗)$/,''),{toneType:'none'}):s.replace(/( District| County| City| Banner)$/i,''));}
const manualNames={'320116':['Luhe'],'310112':['Minhang'],'360428':['Duchang']};
const namesIndex=new Map();
for(const p of Object.values(catalog).filter(p=>p.level==='district'))for(const key of new Set([nameKey(p.name),...(manualNames[p.adcode]||[]).map(normalize)])){if(!namesIndex.has(key))namesIndex.set(key,[]);namesIndex.get(key).push(p);}
function contains(f,p){return [p.center,p.centroid].filter(Boolean).some(point=>booleanPointInPolygon(point,f));}
const groups=new Map();const mappings=[];const unmatched=[];const used=new Set();
function add(parent,f){if(!groups.has(parent))groups.set(parent,[]);groups.get(parent).push(f);}
function region(p,level,source){const ancestors=['WORLD:156',...(p.acroutes||[]).filter(c=>c!==100000).map(c=>`CN:${c}`)];return {id:`CN:${p.adcode}`,name:p.name,aliases:[pinyin(p.name,{toneType:'none'})],country:'CHN',level,parent:ancestors.at(-1),ancestors,source,...(level<3?{childKey:`CN:${p.adcode}`}:{})};}
for(const original of counties.features){
 const candidates=(namesIndex.get(nameKey(original.properties.shapeName))||[]).filter(p=>contains(original,p));
 if(candidates.length!==1){unmatched.push({shapeID:original.properties.shapeID,name:original.properties.shapeName,reason:candidates.length?'ambiguous name/point crosswalk':'no unambiguous name and point match'});continue;}
 const p=candidates[0];if(used.has(p.adcode)){unmatched.push({shapeID:original.properties.shapeID,name:original.properties.shapeName,reason:'duplicate code crosswalk'});continue;}used.add(p.adcode);
 const f=simplify(original,{tolerance:.0007,highQuality:true});
 f.properties=region(p,3,`geoBoundaries ${sources.counties.boundaryID}; 2017 county snapshot; ODbL-1.0; original: ${original.properties.shapeName}`);
 mappings.push({code:String(p.adcode),shapeID:original.properties.shapeID,sourceName:original.properties.shapeName,method:'name/transliteration (or explicit alias) + catalog centre/centroid containment'});
 add(f.properties.parent,f);
}
// Derive prefecture footprints only from verified county matches. They may be incomplete;
// never label these as an authoritative or current city-boundary dataset.
for(const [parent,features] of [...groups]){
 const p=catalog[parent.split(':')[1]];if(p?.level!=='city')continue;
 const geometries=features.map(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates);
 let coordinates;try{coordinates=clipping.union(...geometries);}catch{coordinates=geometries.flat();}
 const f={type:'Feature',properties:region(p,2,'Derived footprint of matched geoBoundaries 2017 counties; catalog parent grouping; ODbL-1.0; may be incomplete'),geometry:{type:'MultiPolygon',coordinates}};
 add(f.properties.parent,f);
}
const provinceCodes={Hainan:460000,Taiwan:710000,Guangxi:450000,Fujian:350000,Yunnan:530000,Guizhou:520000,Jiangxi:360000,Hunan:430000,Zhejiang:330000,Shanghai:310000,Chongqing:500000,Hubei:420000,Sichuan:510000,Anhui:340000,Jiangsu:320000,Henan:410000,Tibet:540000,Shandong:370000,Qinghai:630000,Ningxia:640000,Shaanxi:610000,Tianjin:120000,Shanxi:140000,Beijing:110000,Gansu:620000,Hebei:130000,Liaoning:210000,Jilin:220000,Xinjiang:650000,'Inner Mongolia':150000,Heilongjiang:230000,Macau:820000,'Hong Kong':810000,Guangzhou:440000};
for(const f of provinces.features){const name=f.properties.shapeName;const key=Object.keys(provinceCodes).find(key=>name.startsWith(key+' '));const code=provinceCodes[key];assert.ok(code,`Unmapped province ${name}`);const p=catalog[code];assert.ok(p,`Missing province catalog ${code}`);f.properties=region(p,1,`geoBoundaries ${sources.provinces.boundaryID}; 2019 province snapshot; Public Domain`);f.properties.aliases.push(name);add('WORLD:156',f);}
const bundles={};let maxBytes=0;let totalBytes=0;
for(const [parent,features] of [...groups].sort()){
 const round=x=>Array.isArray(x)?x.map(round):Math.round(x*1e5)/1e5;
 for(const f of features)f.geometry.coordinates=round(f.geometry.coordinates);
 features.sort((a,b)=>a.properties.id.localeCompare(b.properties.id));
 const p=parent==='WORLD:156'?catalog['100000']:catalog[parent.split(':')[1]];
 const expected=p.children?.length||p.childrenNum||0;
 const coverage={snapshot:'2017 counties / 2019 provinces',available:features.length,expected,derived:features.some(f=>f.properties.level===2),partial:features.length<expected};
 const text=JSON.stringify({type:'FeatureCollection',atlasCoverage:coverage,features});const bytes=Buffer.byteLength(text);
 const filename=parent.replace(':','-')+'.json';await writeFile(new URL(filename,output),text);
 bundles[parent]={file:filename,bytes,sha256:createHash('sha256').update(text).digest('hex'),...coverage};maxBytes=Math.max(maxBytes,bytes);totalBytes+=bytes;
}
assert.equal(groups.get('CN:320100').length,11,'Nanjing must include all eleven county-level districts');assert.equal(groups.get('CN:320000').length,13,'Jiangsu must include all thirteen prefecture-level cities');
assert.ok(groups.get('CN:320100').some(f=>f.properties.id==='CN:320102'));
const missingCatalog=Object.values(catalog).filter(p=>p.level==='district'&&!used.has(p.adcode)).map(p=>({code:String(p.adcode),name:p.name}));
await writeFile(new URL('manifest.json',output),JSON.stringify({schemaVersion:1,sources,bundles,matchedCounties:mappings.length,unmatchedSourceCounties:unmatched.length,missingCatalogCounties:missingCatalog.length,totalBytes,maxBytes,warning:'Historical, partial snapshot. City polygons are derived county footprints; missing/renamed divisions are not invented. Switch to the external snapshot when more coverage is needed.'},null,2));
await writeFile(new URL('crosswalk.json',output),JSON.stringify({mappings,unmatched,missingCatalog},null,2));
// Refuse stale generated output: removal is deliberately left to a reviewed update.
const expectedFiles=new Set([...Object.values(bundles).map(b=>b.file),'manifest.json','crosswalk.json','LICENSE.txt','CATALOG-LICENSE.txt']);
for(const file of await readdir(output))assert.ok(expectedFiles.has(file),`Stale generated file requires review: ${file}`);
console.log({bundles:groups.size,matchedCounties:mappings.length,unmatchedSourceCounties:unmatched.length,missingCatalogCounties:missingCatalog.length,totalMB:totalBytes/1e6,maxKB:maxBytes/1000});
