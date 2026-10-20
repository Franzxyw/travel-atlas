import {chromium,webkit,devices} from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.ATLAS_TEST_URL||'http://127.0.0.1:4173/travel-atlas/';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1360,height:900}}],['iphone',webkit,{...devices['iPhone 13']}]] ){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage(options);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Both the original provider AND all GitHub boundary mirrors are unavailable.
  const external=[];const local=[];
  const appOrigin=new URL(url).origin;
  await page.route('**/*',route=>{const request=new URL(route.request().url());if(['geo.datav.aliyun.com','raw.githubusercontent.com','media.githubusercontent.com','www.geoboundaries.org'].includes(request.hostname)){external.push(request.href);return route.abort();}if(request.origin===appOrigin&&request.pathname.includes('/data/china/'))local.push(request.pathname.split('/').at(-1));return route.continue();});
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
  assert.deepEqual(external,[],'No external boundary requests needed');assert.deepEqual(local,['WORLD-156.json','CN-320000.json','CN-320100.json'],'Only the three requested parent layers download');
  await page.locator('.breadcrumbs').getByRole('button',{name:'World',exact:true}).click();await page.locator('[data-region-id="WORLD:156"]').click();await page.getByRole('button',{name:'Explore divisions',exact:false}).click();
  // A missing first-party asset must be actionable, preserve visits, and be retryable.
  await page.route('**/data/china/CN-110000.json',route=>route.fulfill({status:404,body:'Not found'}));
  await page.locator('.region-row').filter({hasText:'北京市'}).click();await page.getByRole('button',{name:'Explore divisions',exact:false}).click();await page.locator('.error').waitFor();assert.match(await page.locator('.error').textContent(),/External snapshot/);
  await page.unroute('**/data/china/CN-110000.json');await page.locator('.error').getByRole('button',{name:'Retry'}).click();await page.locator('.region-row').filter({hasText:'朝阳区'}).waitFor();
  await page.locator('.region-row').filter({hasText:'朝阳区'}).click();assert.match(await page.locator('.selection-heading').textContent(),/District/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('travel-atlas:visits:v1')).records.length),1,'Retry/navigation never modifies visits');assert.deepEqual(external,[]);
  console.log(name+': same-origin China → 江苏省 → 南京市 → 玄武区 passed with all external providers blocked; only three lazy bundles and one explicit visit');
 }finally{await browser.close();}
}
