import { afterEach,describe,expect,it,vi } from 'vitest';
import type { RegionFeature } from './types';
const feature=(adcode:number,name:string,level:string,parent:number|null)=>({type:'Feature',properties:{adcode,name,level,parent:{adcode:parent},childrenNum:12},geometry:{type:'Polygon',coordinates:[[[110,30],[111,30],[111,31],[110,30]]]}});
const fc=(features:unknown[])=>({type:'FeatureCollection',features});
const root:RegionFeature={type:'Feature',properties:{id:'WORLD:156',name:'中国',aliases:[],level:0,parent:null,ancestors:[],country:'CHN',source:'test'},geometry:{type:'Polygon',coordinates:[]}};
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('China boundary fallback',()=>{
 it('uses a province collection when the primary service fails',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(Response.json(fc([feature(320000,'江苏省','province',100000)])));
  vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');const result=await children(root,{chinaExternal:true});
  expect(fetcher.mock.calls[1][0]).toContain('geojson_full/100000_full.json');expect(result.features[0].properties).toMatchObject({id:'CN:320000',name:'江苏省',level:1,parent:'WORLD:156'});
 });
 it('rejects a successful response containing the country itself and falls back',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(fc([feature(100000,'中华人民共和国','country',null)]))).mockResolvedValueOnce(Response.json(fc([feature(320000,'江苏省','province',100000)])));
  vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');expect((await children(root,{chinaExternal:true})).features[0].properties.id).toBe('CN:320000');expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('rejects invalid fallback data and permits a subsequent retry',async()=>{
  const invalid=fc([feature(100000,'中华人民共和国','country',null)]);
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(invalid)).mockResolvedValueOnce(Response.json(invalid)).mockResolvedValueOnce(Response.json(fc([feature(320000,'江苏省','province',100000)])));
  vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');await expect(children(root,{chinaExternal:true})).rejects.toThrow('parent');expect((await children(root,{chinaExternal:true})).features[0].properties.id).toBe('CN:320000');
 });
});
describe('first-party China bundles',()=>{
 const coverage={snapshot:'test',available:1,expected:1,partial:false,derived:false};
 const valid={type:'FeatureCollection',atlasCoverage:coverage,features:[{...root,properties:{...root.properties,id:'CN:320000',name:'江苏省',level:1,parent:'WORLD:156',ancestors:['WORLD:156']}}]};
 it('loads only the requested same-origin bundle by default and caches it',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json(valid));vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');expect((await children(root)).features[0].properties.id).toBe('CN:320000');await children(root);expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toMatch(/data\/china\/WORLD-156\.json$/);});
 it('rejects a parent polygon in a local bundle and does not silently contact providers',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json({...valid,features:[root]}));vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');await expect(children(root)).rejects.toThrow('External snapshot');expect(fetcher).toHaveBeenCalledTimes(1);});
 it('rejects unrelated parents, duplicate IDs, and non-increasing levels',async()=>{for(const patch of [{parent:'CN:999999'},{level:0},{country:'DEU'}]){vi.resetModules();const fetcher=vi.fn().mockResolvedValue(Response.json({...valid,features:[{...valid.features[0],properties:{...valid.features[0].properties,...patch}}]}));vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');await expect(children(root)).rejects.toThrow('invalid');}vi.resetModules();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({...valid,features:[valid.features[0],valid.features[0]]})));const {children}=await import('./data');await expect(children(root)).rejects.toThrow('invalid');});
 it('does not cache missing assets so retry can recover',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:404})).mockResolvedValueOnce(Response.json(valid));vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');await expect(children(root)).rejects.toThrow('External snapshot');expect((await children(root)).features.length).toBe(1);});
 it('keeps local and explicitly selected external caches separate',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json(valid)).mockResolvedValueOnce(Response.json(fc([feature(110000,'北京市','province',100000)])));vi.stubGlobal('fetch',fetcher);const {children}=await import('./data');expect((await children(root)).features[0].properties.id).toBe('CN:320000');expect((await children(root,{chinaExternal:true})).features[0].properties.id).toBe('CN:110000');expect(fetcher).toHaveBeenCalledTimes(2);});
});
