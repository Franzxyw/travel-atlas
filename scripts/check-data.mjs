import { readdir,readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('../public/data/',import.meta.url);const countries=JSON.parse(await readFile(new URL('world.json',dir)));assert.equal(new Set(countries.features.map(f=>f.properties.id)).size,countries.features.length);
let n=0;const ids=new Set(countries.features.map(f=>f.properties.id));const parents=[];
function checkCoords(x){if(typeof x[0]==='number'){assert.ok(Number.isFinite(x[0])&&x[0]>=5&&x[0]<=16,'Germany longitude must be WGS84');assert.ok(Number.isFinite(x[1])&&x[1]>=47&&x[1]<=56,'Germany latitude must be WGS84');}else x.forEach(checkCoords);}
for(const file of await readdir(dir)){if(!file.startsWith('DE-')&&file!=='WORLD-276.json')continue;const fc=JSON.parse(await readFile(new URL(file,dir)));for(const f of fc.features){assert.ok(!ids.has(f.properties.id),'Unique administrative identifiers');ids.add(f.properties.id);parents.push(f.properties.parent);checkCoords(f.geometry.coordinates);n++;}}
for(const parent of parents)assert.ok(ids.has(parent),'Existing administrative parent '+parent);console.log('Verified WGS84 geometry, unique identifiers and parent links:',n,'German regions');
