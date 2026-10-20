import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { Collection } from './data';
import type { RegionFeature, Visits } from './types';
export const colors={visited:'#287e66',uncertain:'#ce9735',transit:'#647fb2'};
function Layers({collection,visits,selected,choose}:{collection:Collection;visits:Visits;selected:Set<string>;choose:(f:RegionFeature)=>void}){
 const map=useMap();const callback=useRef(choose);callback.current=choose;
 useEffect(()=>{
  const layer=L.geoJSON(collection,{attribution:collection.atlasCoverage?`China: <a href="https://www.geoboundaries.org/">geoBoundaries / OSM</a> · <a href="${import.meta.env.BASE_URL}data/china/LICENSE.txt">ODbL / PD</a>`:undefined,style:f=>{
   const id=f!.properties.id;const v=visits[id];const contained=Object.values(visits).some(v=>v.region.ancestors.includes(id));
   return {color:selected.has(id)?'#e3683f':v?colors[v.status]:'#617e73',weight:selected.has(id)?3:1,fillColor:v?colors[v.status]:contained?'#aacdb9':'#e1e9de',fillOpacity:v?.status==='visited'?.6:v?.status==='uncertain'?.4:v?.status==='transit'?.4:contained?.22:.1,dashArray:v?.status==='uncertain'?'5 4':contained&&!v?'2 4':undefined};
  },onEachFeature:(feature,layer)=>{const text=document.createElement('span');text.textContent=feature.properties.name;layer.bindTooltip(text,{sticky:true});layer.on('add',()=>{const path=(layer as L.Path).getElement?.();path?.setAttribute('data-region-id',feature.properties.id);path?.setAttribute('aria-label',feature.properties.name);});layer.on('click',e=>{L.DomEvent.stopPropagation(e);callback.current(feature as RegionFeature);});}}).addTo(map);
  return ()=>{map.removeLayer(layer);};
 },[collection,visits,selected,map]);
 useEffect(()=>{if(!collection.features.length)return;if(collection.features.every(f=>f.properties.level===0)){map.setView([25,12],2,{animate:false});return;}const bounds=L.geoJSON(collection).getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[18,18],maxZoom:12,animate:false});},[collection,map]);
 useEffect(()=>{const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(map.getContainer());return()=>observer.disconnect();},[map]);
 return null;
}
export default function AtlasMap(props:{collection:Collection;visits:Visits;selected:Set<string>;choose:(f:RegionFeature)=>void}){
 return <MapContainer center={[25,12]} zoom={2} minZoom={1} maxZoom={18} zoomControl={false} className="atlas-map" worldCopyJump>
 <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
 <Layers {...props}/><Zoom/>
 </MapContainer>;
}
function Zoom(){const map=useMap();useEffect(()=>{const control=L.control.zoom({position:'topright'}).addTo(map);return()=>{control.remove();};},[map]);return null;}
