import countries from 'world-countries';
import { feature } from 'topojson-client';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
const topology=JSON.parse(await readFile(new URL('../node_modules/world-atlas/countries-110m.json',import.meta.url),'utf8'));
const fc=feature(topology,topology.objects.countries);
// The quantized source sometimes assigns the opposite sign to a date-line endpoint.
// Keep each small date-line ring continuous so Leaflet doesn't draw it across the world.
function unwrap(x){if(Array.isArray(x[0])&&typeof x[0][0]==='number'){for(let i=1;i<x.length;i++){while(x[i][0]-x[i-1][0]>180)x[i][0]-=360;while(x[i][0]-x[i-1][0]<-180)x[i][0]+=360;}}else for(const part of x)unwrap(part);}
for(const f of fc.features)if(String(f.id)!=='010'&&f.geometry.coordinates)unwrap(f.geometry.coordinates);
for(const f of fc.features){const c=countries.find(c=>c.ccn3===String(f.id).padStart(3,'0'));const id='WORLD:'+String(f.id).padStart(3,'0'); const native=c?Object.values(c.name.native).map(n=>n.common):[];f.properties={id,name:native.length?[...new Set(native)].join(' / '):f.properties.name,aliases:[f.properties.name,...(c?[c.name.common,c.translations.zho?.common,...c.altSpellings]:[])].filter(Boolean),country:c?.cca3||'UNK',iso3:c?.cca3,level:0,parent:null,ancestors:[],source:'Natural Earth via world-atlas; country naming via world-countries',childKey:id};}
for(const f of fc.features)if(!/^WORLD:\d{3}$/.test(f.properties.id))f.properties.id='WORLD:NE-'+f.properties.name.replace(/[^A-Za-z0-9]/g,'');
if(new Set(fc.features.map(f=>f.properties.id)).size!==fc.features.length)throw new Error('Duplicate world identifiers');
await mkdir(new URL('../public/data/',import.meta.url),{recursive:true});await writeFile(new URL('../public/data/world.json',import.meta.url),JSON.stringify(fc));console.log('World polygons:',fc.features.length);
