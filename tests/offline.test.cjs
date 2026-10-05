const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../travel-companion.js');
const worker = fs.readFileSync(require.resolve('../service-worker.js'),'utf8');
function runtime({fail=false,offline=false}={}){
 const listeners={},cached=new Map(),deleted=[],requests=[];
 const cache={addAll:async urls=>{if(fail)throw new Error('install interrupted');urls.forEach(r=>cached.set(r.url,new Response('saved '+r.url)));},
   put:async(k,r)=>cached.set(k,r),match:async k=>cached.get(k)?.clone()};
 const self={location:new URL('https://example.test/trip/service-worker.js'),registration:{scope:'https://example.test/trip/'},clients:{claim:async()=>{}},addEventListener:(t,f)=>listeners[t]=f};
 vm.runInNewContext(worker,{self,URL,Request,Response,AbortController,setTimeout,clearTimeout,
  caches:{open:async()=>cache,keys:async()=>['sg-travel-shell-old','unrelated-cache'],delete:async k=>{deleted.push(k);return true;}},
  fetch:async r=>{requests.push(r.url);if(offline)throw new Error('offline');return new Response('fresh');}});
 return {listeners,cached,deleted,requests};
}
test('registration is relative, supported only in secure contexts, and fails gracefully',async()=>{
 assert.equal(await C.registerOffline({navigator:{},isSecureContext:true}),null);
 assert.equal(await C.registerOffline({navigator:{serviceWorker:{}},isSecureContext:false}),null);
 assert.equal(await C.registerOffline({navigator:{serviceWorker:{register:()=>Promise.reject(new Error('blocked'))}},isSecureContext:true}),null);
 assert.equal(await C.registerOffline({navigator:{serviceWorker:{register:()=>{throw new Error('blocked');}}},isSecureContext:true}),null);
 let captured;
 await C.registerOffline({navigator:{serviceWorker:{register:async(...args)=>{captured=args;return {};}}},isSecureContext:true});
 assert.deepEqual(captured,['./service-worker.js',{scope:'./',updateViaCache:'none'}]);
});
test('install saves only the essential local shell; activation removes only our stale cache',async()=>{
 const r=runtime();let task;
 r.listeners.install({waitUntil:p=>task=p});await task;
 assert.equal(r.cached.size,6);
 assert.ok(r.cached.has('https://example.test/trip/index.html'));
 r.listeners.activate({waitUntil:p=>task=p});await task;
 assert.deepEqual(r.deleted,['sg-travel-shell-old']);
});
test('an interrupted new installation rejects and cannot silently activate an incomplete guide',async()=>{
 const r=runtime({fail:true});let task;r.listeners.install({waitUntil:p=>task=p});
 await assert.rejects(task,/interrupted/);assert.equal(r.cached.size,0);
});
test('offline guide reload strips query/hash to the canonical shell, preserving all embedded travel information',async()=>{
 const r=runtime({offline:true});let task;r.listeners.install({waitUntil:p=>task=p});await task;
 let response;
 r.listeners.fetch({request:{url:'https://example.test/trip/index.html?at=anything',method:'GET',mode:'navigate'},respondWith:p=>response=p});
 assert.match(await (await response).text(),/saved .*index.html$/);
 r.listeners.fetch({request:{url:'https://example.test/trip/',method:'GET',mode:'navigate'},respondWith:p=>response=p});
 assert.match(await (await response).text(),/saved .*index.html$/);
});
test('online visits refresh stale shell; external Maps, fonts and tiles are never intercepted',async()=>{
 const r=runtime();let response;
 r.listeners.fetch({request:new Request('https://example.test/trip/travel-companion.js'),respondWith:p=>response=p});
 assert.equal(await (await response).text(),'fresh');
 assert.equal(await r.cached.get('https://example.test/trip/travel-companion.js').text(),'fresh');
 for(const url of ['https://www.google.com/maps','https://tile.openstreetmap.org/1/1/1.png','https://fonts.googleapis.com/test','https://example.test/other/index.html']){
  let handled=false;r.listeners.fetch({request:new Request(url),respondWith:()=>handled=true});assert.equal(handled,false);
 }
});
