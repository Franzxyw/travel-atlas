import { readFile,writeFile,readdir } from 'node:fs/promises';
import { pinyin } from 'pinyin-pro';
const dir=new URL('../public/data/',import.meta.url);const result=new Map();
for(const file of await readdir(dir)){if(file==='world.json'||file.startsWith('DE-')||file==='WORLD-276.json'){const fc=JSON.parse(await readFile(new URL(file,dir)));for(const f of fc.features)result.set(f.properties.id,f.properties);}}
const res=await fetch('https://raw.githubusercontent.com/zhChuXiao/ChinaGeoJson/master/info.json');if(!res.ok)throw new Error('China name catalog unavailable');const info=await res.json();
const names={'江苏省':['Jiangsu'],'南京市':['Nanjing','Nanking'],'淮安市':["Huai’an",'Huaian'],'北京市':['Beijing','Peking'],'上海市':['Shanghai'],'广州市':['Guangzhou','Canton'],'深圳市':['Shenzhen'],'杭州市':['Hangzhou']};
for(const [code,p] of Object.entries(info)){if(code==='100000'||!p.name)continue;const ancestors=['WORLD:156',...(p.acroutes||[]).filter(c=>c!==100000).map(c=>`CN:${c}`)];const level=p.level==='district'?3:p.level==='city'?2:1;result.set(`CN:${code}`,{id:`CN:${code}`,name:p.name,aliases:[pinyin(p.name,{toneType:'none'}),...(names[p.name]||[])],country:'CHN',level,parent:ancestors.at(-1),ancestors,source:'DataV name catalog',...(p.childrenNum?{childKey:`CN:${code}`}:{})});}
await writeFile(new URL('search.json',dir),JSON.stringify([...result.values()]));console.log('Search entries',result.size);
