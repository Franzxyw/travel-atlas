import { afterEach,describe,expect,it,vi } from 'vitest';
import type { RegionFeature } from './types';
const feature=(adcode:number,name:string,level:string,parent:number|null)=>({type:'Feature',properties:{adcode,name,level,parent:{adcode:parent},childrenNum:12},geometry:{type:'Polygon',coordinates:[[[110,30],[111,30],[111,31],[110,30]]]}});
const fc=(features:unknown[])=>({type:'FeatureCollection',features});
const root:RegionFeature={type:'Feature',properties:{id:'WORLD:156',name:'中国',aliases:[],level:0,parent:null,ancestors:[],country:'CHN',source:'test'},geometry:{type:'Polygon',coordinates:[]}};
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('China boundary fallback',()=>{
 it('uses a province collection when the primary service fails',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(Response.json(fc([feature(320000,'江苏省','province',100000)])));
  vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');const result=await children(root);
  expect(fetcher.mock.calls[1][0]).toContain('geojson_full/100000_full.json');expect(result.features[0].properties).toMatchObject({id:'CN:320000',name:'江苏省',level:1,parent:'WORLD:156'});
 });
 it('rejects a successful response containing the country itself and falls back',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(fc([feature(100000,'中华人民共和国','country',null)]))).mockResolvedValueOnce(Response.json(fc([feature(320000,'江苏省','province',100000)])));
  vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');expect((await children(root)).features[0].properties.id).toBe('CN:320000');expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('rejects invalid fallback data and permits a subsequent retry',async()=>{
  const invalid=fc([feature(100000,'中华人民共和国','country',null)]);
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(invalid)).mockResolvedValueOnce(Response.json(invalid)).mockResolvedValueOnce(Response.json(fc([feature(320000,'江苏省','province',100000)])));
  vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');await expect(children(root)).rejects.toThrow('parent');expect((await children(root)).features[0].properties.id).toBe('CN:320000');
 });
});
