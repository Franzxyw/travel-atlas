import {chromium,webkit,devices} from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.ATLAS_TEST_URL||'http://127.0.0.1:4173/travel-atlas/';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1360,height:900}}],['iphone',webkit,{...devices['iPhone 13']}]] ){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage(options);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Reproduce the user's failure: every primary boundary request is unavailable.
  await page.route('https://geo.datav.aliyun.com/**',route=>route.abort());
  await page.goto(url);await page.locator('[data-region-id="WORLD:156"]').waitFor();await page.locator('[data-region-id="WORLD:156"]').click();
  await page.getByRole('button',{name:'Explore divisions',exact:false}).click();
  await page.locator('.region-row').filter({hasText:'江苏省'}).waitFor({timeout:60000});
  assert.ok(await page.locator('.region-row').count()>=30);assert.equal(await page.locator('.region-row').filter({hasText:'中华人民共和国'}).count(),0);
  await page.locator('.region-row').filter({hasText:'江苏省'}).click();await page.getByRole('button',{name:'Explore divisions',exact:false}).click();
  await page.locator('.region-row').filter({hasText:'南京市'}).waitFor({timeout:60000});assert.equal(await page.locator('.region-row').count(),13);
  await page.locator('.region-row').filter({hasText:'南京市'}).click();await page.getByRole('button',{name:'Explore divisions',exact:false}).click();
  await page.locator('.region-row').filter({hasText:'玄武区'}).waitFor({timeout:60000});assert.equal(await page.locator('.region-row').count(),11);
  await page.locator('.region-row').filter({hasText:'玄武区'}).click();await page.getByRole('button',{name:'Visited',exact:true}).click();
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records);assert.equal(records.length,1);assert.equal(records[0].region.id,'CN:320102');assert.deepEqual(errors,[]);
  console.log(name+': forced fallback passed: China → 江苏省 → 南京市 → 玄武区; only one explicit visit recorded');
 }finally{await browser.close();}
}
