import { chromium,webkit,devices } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { mkdir,writeFile } from 'node:fs/promises';
const out=new URL('../../qa/',import.meta.url);await mkdir(out,{recursive:true});
const summaries=[];
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:1000}}],['iphone',webkit,{...devices['iPhone 13']}],['ipad',webkit,{...devices['iPad (gen 7)']}]]){
 const browser=await engine.launch();const context=await browser.newContext(options);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:4173/travel-atlas/');await page.locator('.region-row').filter({hasText:'Deutschland'}).waitFor();
 await page.locator('.map-loading').waitFor({state:'hidden'});assert.ok(await page.locator('.atlas-map svg path').count()>100);assert.equal(await page.evaluate(()=>localStorage.getItem('travel-atlas:visits:v1')&&JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.length),0);
 await page.locator('[data-region-id="WORLD:276"]').click();await page.getByRole('button',{name:'Explore divisions',exact:false}).click();await page.locator('.region-row').filter({hasText:'Bayern'}).waitFor();
 await page.locator('.region-row').filter({hasText:'Bayern'}).click();await page.getByRole('button',{name:'Visited',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.length),1);
 await page.getByRole('button',{name:'Explore divisions',exact:false}).click();await page.locator('.region-row').filter({hasText:'München'}).first().waitFor();
 assert.equal(await page.locator('.region-row .row-dot[style*="rgb(40, 126, 102)"]').count(),0);
 await page.getByRole('button',{name:'Select several',exact:false}).click();await page.locator('.region-row').filter({hasText:'Ingolstadt'}).click();await page.locator('.region-row').filter({hasText:'Rosenheim'}).first().click();await page.getByRole('button',{name:'Transit-only',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.length),3);await page.getByRole('button',{name:'Undo',exact:false}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.length),1);
 await page.getByRole('combobox',{name:'UI language'}).selectOption('zh');await page.reload();await page.locator('.region-row').first().waitFor();assert.equal(await page.getByRole('combobox').inputValue(),'zh');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.length),1);
 await page.getByRole('combobox').selectOption('en');await page.getByRole('textbox',{name:'Find a place in any language'}).fill('慕尼黑');await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.search-results button').filter({hasText:'München'}).first().click();await page.locator('.selection-heading h2').filter({hasText:'München'}).waitFor();
 await page.getByRole('button',{name:'Explore divisions',exact:false}).click();await page.locator('.map-loading').waitFor({state:'hidden'});await page.locator('.region-row').filter({hasText:'München'}).first().waitFor();assert.equal(await page.locator('.region-row').count(),1);
 await page.screenshot({path:new URL(name+'.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
 await page.getByRole('textbox',{name:'Find a place in any language'}).fill('Nanjing');await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.search-results button').filter({hasText:'南京市'}).first().click();await page.locator('.selection-heading h2').filter({hasText:'南京市'}).waitFor({timeout:90000});await page.getByRole('button',{name:'Explore divisions',exact:false}).click();await page.locator('.region-row').filter({hasText:'玄武区'}).waitFor({timeout:90000});await page.locator('.region-row').filter({hasText:'玄武区'}).click();await page.getByRole('button',{name:'Uncertain',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.find(r=>r.region.id==='CN:320102').status),'uncertain');
 await page.screenshot({path:new URL(name+'-china.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
 summaries.push({name,passed:true,errors,notes:'Real WebKit engine on Windows with mobile viewport/touch emulation; not physical iOS Safari.'});
 }catch(e){await page.screenshot({path:new URL(name+'-failure.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});summaries.push({name,passed:false,error:String(e),errors});console.error(name,e);}finally{await browser.close();}
}
await writeFile(new URL('results.json',out),JSON.stringify(summaries,null,2));console.log(summaries);if(summaries.some(s=>!s.passed))process.exitCode=1;
