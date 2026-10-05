// Real Chromium validation of responsive UI, persistence, route map and offline reload.
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // External services unavailable offline; check the local shell independently of font/tile connectivity.
 await page.route(/https:\/\/(fonts\.|tile\.openstreetmap)/,r=>r.abort());
 const base='http://127.0.0.1:8765/index.html';
 async function load(at,hash='home'){
  await page.goto(base+'?at='+encodeURIComponent(at)+'#'+hash,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TravelCompanion&&window.SGMAP);
 }
 async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');}
 const report=[];
 fs.mkdirSync(path.join(__dirname,'..','artifacts'),{recursive:true});
 for(const viewport of [{width:390,height:844},{width:430,height:932},{width:1280,height:900}]){
  await page.setViewportSize(viewport);
  await load('2026-10-05T02:00:00Z');
  assert.match(await page.locator('#travel-status').innerText(),/還有 3 天/);
  assert.equal(await page.locator('#home-more').getAttribute('open'),null);
  await overflow();
  await page.locator('[data-home-target="accommodation"]').click();
  assert.equal(await page.locator('#home-more').evaluate(x=>x.open),true);
  await page.locator('[data-home-target="flights"]').click();
  assert.ok(await page.locator('#flights').isVisible());
  await page.locator('#moreBtn').click();
  await page.locator('#moreNav a[href="#money"]').click();
  assert.ok(await page.locator('#money').isVisible());
  assert.equal(await page.locator('#card-research').evaluate(x=>x.open),false);
  await overflow();
  await load('2026-10-08T12:00:00Z');
  assert.match(await page.locator('#travel-status .tc-tomorrow').innerText(),/明天有寺廟行程：記得準備長褲＋包鞋/);
  await overflow();
  if(viewport.width===390)await page.screenshot({path:path.join(__dirname,'..','artifacts','final-d1-reminder.png'),fullPage:false});
  await load('2026-10-09T12:00:00Z');
  assert.equal(await page.locator('#travel-status .tc-tomorrow').count(),0);
  await page.locator('.nav a[href="#map"]').click();
  await page.locator('#mtabs button').filter({hasText:'總覽'}).click();
  for(const label of ['兄弟組｜Hotel 81 Premier Star','夫妻組｜ibis budget Singapore Imperial']) {
   assert.match(await page.locator('#mhead').innerText(),new RegExp(label));
   const marker=page.getByRole('button',{name:label+'（D1–D4）',exact:true});
   assert.equal(await marker.count(),1);
   assert.ok(await marker.isVisible());
   await marker.locator('.lab').click();
   assert.equal(await page.locator('#m-pop h4').innerText(),label);
   await page.locator('#m-pop button[aria-label="關閉"]').click();
   await page.locator('#mtabs button').filter({hasText:'總覽'}).click();
  }
  await overflow();
  if(viewport.width===390)await page.screenshot({path:path.join(__dirname,'..','artifacts','final-overview-hotels.png'),fullPage:false});
  await page.locator('#moreBtn').click();
  await page.locator('#moreNav a[href="#todo"]').click();
  const help=page.getByRole('link',{name:'下載教學',exact:true});
  const helpURL=new URL(await help.getAttribute('href'));
  assert.equal(helpURL.hostname,'support.google.com');
  assert.equal(helpURL.pathname,'/maps/answer/6291838');
  assert.equal(helpURL.searchParams.get('hl'),'zh-Hant');
  assert.equal(await help.getAttribute('target'),'_blank');
  assert.equal(await page.locator('[data-k="b6"]').count(),1);
  await overflow();
  await load('2026-10-09T02:30:00Z','d2');
  await page.locator('#tc-rain-toggle-d2').click();
  assert.ok(!/雙溫室|Flower Dome|Cloud Forest|ION/.test(await page.locator('#tc-rain-d2').innerText()));
  for(let i=1;i<=4;i++){
   const iso='2026-10-'+String(7+i).padStart(2,'0')+'T00:10:00Z';
   await load(iso,'d'+i);
   await overflow();
   const route=await page.locator('#d'+i+' .tc-route-stop .tc-number').allTextContents();
   assert.deepEqual(route,route.map((_,j)=>String(j+1)));
   assert.ok(!(await page.locator('#d'+i+' .tc-route').innerText()).includes('OPTION · OPTION'));
   await page.locator('#d'+i+' .tc-day .mapjump').click();
   await page.waitForFunction(()=>document.querySelector('#m-svg').clientWidth>0);
   await page.waitForTimeout(150);
   const data=await page.evaluate(()=>{
    const d=SGMAP.days.find(d=>d.id===SGMAP.state.day);
    return {day:d.id,count:d.routeCount,n:d.stops.map(s=>s.n),unmapped:d.stops.filter(s=>!s.ll).map(s=>s.name),lines:document.querySelectorAll('#m-svg line').length};
   });
   assert.equal(data.day,'D'+i);assert.equal(data.count,route.length);
   assert.deepEqual([...new Set(data.n)],route.map(Number));
   assert.ok(data.lines>0);
   // Both hotels have a single shared route number; never two consecutive hotel visits.
   const hotels=await page.evaluate(()=>SGMAP.days.find(d=>d.id===SGMAP.state.day).stops.filter(s=>s.parallel).map(s=>({n:s.n,q:s.q})));
   if(hotels.length)assert.equal(hotels[0].n,hotels[1].n);
   await overflow();
   report.push({viewport,route:data});
  }
  await load('2026-10-10T09:00:00Z','d3');
  await page.locator('#tc-rain-toggle-d3').click();
  assert.equal(await page.locator('#tc-rain-d3 > .tc-rain-option').count(),1);
  assert.match(await page.locator('#tc-rain-d3 > .tc-rain-option').innerText(),/Oceanarium/);
  assert.equal(await page.locator('#tc-rain-d3 details.tc-disclosure').evaluate(x=>x.open),false);
  await overflow();
  await load('2026-10-11T00:10:00Z');
  assert.match(await page.locator('#travel-status').innerText(),/08:15/);
  assert.match(await page.locator('#travel-status').innerText(),/Grab/);
  assert.match(await page.locator('#travel-status .tc-destination').innerText(),/Changi Airport T3/);
  assert.equal(await page.locator('.tc-current-day').innerText(),'D4');
  assert.match(await page.locator('#travel-status').innerText(),/兄弟組｜Hotel 81 Premier Star/);
  assert.match(await page.locator('#travel-status').innerText(),/夫妻組｜ibis budget Singapore Imperial/);
  assert.ok(await page.locator('.nav').evaluate(x=>x.getBoundingClientRect().bottom<=100));
  await overflow();
  await load('2026-10-12T02:00:00Z');
  assert.match(await page.locator('#travel-status').innerText(),/旅行已完成/);
 }
 // Theme and selection persistence survive a full reload.
 await page.setViewportSize({width:390,height:844});
 await load('2026-10-10T09:00:00Z','d3');
 await page.locator('#themeBtn').click();await page.locator('#themeBtn').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.evaluate(()=>SGPLAN.setDec('d3-eve','e'));
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 assert.equal(await page.evaluate(()=>SGPLAN.shown(TRIP.slotById['d3-eve']).opt.id),'e');
 assert.ok(await page.locator('#d3 .tc-route').isVisible());
 await page.locator('#tc-rain-toggle-d3').click();
 await overflow();
 fs.mkdirSync(path.join(__dirname,'..','artifacts'),{recursive:true});
 await page.screenshot({path:path.join(__dirname,'..','artifacts','mobile-rain-dark.png'),fullPage:false});
 await load('2026-10-11T01:00:00Z','d4');
 await page.evaluate(()=>SGPLAN.setDec('d4-go','a'));
 assert.match(await page.locator('#d4 [data-item-id="d4-arr"] .time').innerText(),/09:30–09:45/);
 assert.match(await page.locator('#d4 [data-item-id="d4-go"] .time').innerText(),/08:30/);
 await page.evaluate(()=>SGPLAN.setDec('d4-go',null));
 for(const viewport of [{width:390,height:844},{width:430,height:932},{width:1280,height:900}]){
  await page.setViewportSize(viewport);await load('2026-10-11T00:10:00Z');await overflow();
  await page.screenshot({path:path.join(__dirname,'..','artifacts',viewport.width+'-home-dark.png'),fullPage:false});
  await load('2026-10-10T09:00:00Z','d3');await page.locator('#d3 .tc-day .mapjump').click();await page.waitForTimeout(150);await overflow();
  await page.screenshot({path:path.join(__dirname,'..','artifacts',viewport.width+'-map-dark.png'),fullPage:false});
 }
 await load('2026-10-09T01:35:00Z');
 await page.locator('#themeBtn').click(); // dark → auto; take a light Home reference in a light OS context
 await page.screenshot({path:path.join(__dirname,'..','artifacts','home-control-center.png'),fullPage:false});
 // Read-only printing check: lower-priority details must still print, and restore afterward.
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 assert.equal(await page.locator('#home-more').evaluate(x=>x.open),true);
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 assert.equal(await page.locator('#home-more').evaluate(x=>x.open),false);
 // Fresh context uses the genuine wall clock so test-clock pages do not pollute offline cache.
 const offline=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));
 await op.goto(base+'#home',{waitUntil:'domcontentloaded'});
 await op.evaluate(async()=>{await navigator.serviceWorker.ready; if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 await offline.setOffline(true);await op.reload({waitUntil:'domcontentloaded'});
 assert.equal(await op.locator('.dayroot').count(),4);
 await op.locator('[data-home-target="accommodation"]').click();
 assert.match(await op.locator('#home-more').innerText(),/31 Lor 18 Geylang/);
 assert.match(await op.locator('#home-more').innerText(),/28 Penhas Rd/);
 assert.match(await op.locator('#home-more').innerText(),/SQ878/);
 assert.match(await op.locator('#home-more').innerText(),/999/);
 await op.locator('.nav a[href="#d4"]').click();
 assert.match(await op.locator('#d4 .tc-route').innerText(),/Changi/);
 await op.locator('#d4 .tc-day .mapjump').click();await op.waitForTimeout(200);
 assert.ok(await op.locator('#m-marks .mk').count()>0);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'..','artifacts','mobile-results.json'),JSON.stringify({report,offline:'passed',errors},null,2));
 console.log('PASS: 390×844, 430×932, desktop; no horizontal overflow; D1–D4 route/map ordering; both overview hotels; Home phases; D1-only tomorrow reminder; official Maps help; Rain Mode; D4 Grab primary; theme/options persistence; print; offline reload.');
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
