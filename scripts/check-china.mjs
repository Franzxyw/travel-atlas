import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=new URL('../public/data/china/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',dir)));
const ids=new Set(['WORLD:156']);const rows=[];let total=0;
function coordinates(x){if(typeof x[0]==='number'){assert.ok(x.every(Number.isFinite));assert.ok(x[0]>=70&&x[0]<=140&&x[1]>=0&&x[1]<=60,'China coordinates must be WGS84');}else x.forEach(coordinates);}
for(const [parent,bundle] of Object.entries(manifest.bundles)){
 const text=await readFile(new URL(bundle.file,dir),'utf8');assert.equal(createHash('sha256').update(text).digest('hex'),bundle.sha256);assert.equal(Buffer.byteLength(text),bundle.bytes);assert.ok(bundle.bytes<500000,'Mobile bundle under 500 KB uncompressed');total+=bundle.bytes;
 const fc=JSON.parse(text);assert.equal(fc.type,'FeatureCollection');assert.equal(fc.features.length,bundle.available);assert.deepEqual(fc.atlasCoverage,{snapshot:bundle.snapshot,available:bundle.available,expected:bundle.expected,derived:bundle.derived,partial:bundle.partial});
 for(const f of fc.features){const r=f.properties;assert.match(r.id,/^CN:\d{6}$/);assert.ok(!ids.has(r.id),'Unique code');ids.add(r.id);assert.equal(r.country,'CHN');assert.equal(r.parent,parent);assert.equal(r.ancestors.at(-1),parent);assert.ok(r.level>0&&r.level<=3);assert.ok(!('status' in r)&&!('note' in r)&&!('confirmation' in r),'No private travel fields');coordinates(f.geometry.coordinates);rows.push(r);}
}
for(const r of rows){assert.ok(ids.has(r.parent),'Existing parent');const parent=rows.find(p=>p.id===r.parent);assert.ok(r.level>(parent?.level||0),'Increasing levels');}
assert.equal(total,manifest.totalBytes);
assert.equal(manifest.bundles['WORLD:156'].available,34);assert.equal(manifest.bundles['CN:320000'].available,13);assert.equal(manifest.bundles['CN:320100'].available,11);assert.ok(ids.has('CN:320102'));assert.ok(manifest.unmatchedSourceCounties>0,'Do not hide omissions');
const crosswalk=JSON.parse(await readFile(new URL('crosswalk.json',dir)));assert.equal(crosswalk.mappings.length,manifest.matchedCounties);assert.equal(crosswalk.unmatched.length,manifest.unmatchedSourceCounties);
console.log('Verified China bundle hashes, hierarchy, WGS84, privacy fields and mobile size:',Object.keys(manifest.bundles).length,'bundles;',manifest.matchedCounties,'matched historical counties');
