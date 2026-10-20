import { describe,it,expect } from 'vitest';
import { contextText,makeBackup,markRegions,validateBackup } from './store';
import type { Region } from './types';
const parent:Region={id:'CN:320000',name:'江苏省',aliases:['Jiangsu'],country:'CHN',level:1,parent:'WORLD:156',ancestors:['WORLD:156'],source:'test'};
const child:Region={...parent,id:'CN:320100',name:'南京市',level:2,parent:parent.id,ancestors:['WORLD:156',parent.id]};
describe('visit records',()=>{
 it('marks only explicit selections; never parents or children',()=>{const visits=markRegions({},[parent],'visited');expect(Object.keys(visits)).toEqual([parent.id]);expect(visits[child.id]).toBeUndefined();const childOnly=markRegions({},[child],'uncertain');expect(childOnly[parent.id]).toBeUndefined();});
 it('supports bulk status changes without touching unrelated places',()=>{const initial=markRegions({},[parent],'visited');const next=markRegions(initial,[child],'transit');expect(next[parent.id].status).toBe('visited');expect(next[child.id].status).toBe('transit');expect(initial[child.id]).toBeUndefined();expect(markRegions(next,[child],null)).toEqual(initial);});
 it('round-trips backups and preserves manual confirmation',()=>{const visits=markRegions({},[child],'visited','A memory');expect(validateBackup(makeBackup(visits))[child.id]).toMatchObject({status:'visited',note:'A memory',confirmation:'manual',region:{name:'南京市'}});});
 it('rejects invalid records atomically',()=>{const data=makeBackup(markRegions({},[child],'visited'));expect(()=>validateBackup({...data,records:[...data.records,{...data.records[0],status:'inferred'}]})).toThrow();expect(()=>validateBackup({schemaVersion:2,records:[]})).toThrow();});
 it('strips imported boundary URL/path fields',()=>{const visits=markRegions({},[{...child,childKey:'../../secret'}],'visited');expect(validateBackup(makeBackup(visits))[child.id].region.childKey).toBeUndefined();});
 it('explains unknown places and distinguishes transit in ChatGPT context',()=>{const text=contextText(markRegions({},[child],'transit'));expect(text).toContain('Transit-only');expect(text).toContain('Unlisted places are unknown');expect(text).toContain('南京市');});
});
