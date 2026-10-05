const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../travel-companion.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const context = { window: {} };
vm.runInNewContext(scripts.find(s => s.includes('var TRIP = window.TRIP')), context);
const trip = context.window.TRIP;
const choose = (overrides = {}) => item => ({ opt: item.opts.find(o => o.id === (overrides[item.id] || item.draft)) || null });
const state = (iso, overrides) => C.status(trip, choose(overrides), new Date(iso), []);

test('tomorrow preparation follows actual temple entry, once on D1, not a mosque view on D3', () => {
  const reminder = '👖 明天有寺廟行程：記得準備長褲＋包鞋';
  for (const iso of ['2026-10-07T16:00:00Z', '2026-10-08T12:00:00Z', '2026-10-08T15:59:59Z']) {
    assert.deepEqual(state(iso).tomorrowReminders, [reminder]);
  }
  for (const iso of ['2026-10-08T16:00:00Z', '2026-10-09T12:00:00Z', '2026-10-10T00:00:00Z', '2026-10-11T00:00:00Z']) {
    assert.deepEqual(state(iso).tomorrowReminders, []);
  }
  assert.equal(state('2026-10-07T15:59:59Z').tomorrowReminders, undefined);
  assert.equal(state('2026-10-11T16:00:00Z').tomorrowReminders, undefined);
  // If a future plan explicitly includes mosque entry, its preparation can use the same metadata.
  const extended = JSON.parse(JSON.stringify(trip));
  extended.days[2].items.find(i => i.id === 'd3-kg').templeVisit = true;
  assert.deepEqual(C.status(extended, choose(), new Date('2026-10-09T12:00:00Z'), []).tomorrowReminders, [reminder]);
});

test('final cleanup keeps official offline help, two overview hotels, and current rain plan', () => {
  const overview = html.match(/var OVERVIEW=\[([\s\S]*?)\n\];/)[1];
  assert.match(overview, /兄弟組｜Hotel 81 Premier Star.*type:'hotel'.*v:'hotel'.*q:HQ/);
  assert.match(overview, /夫妻組｜ibis budget Singapore Imperial.*type:'hotel'.*v:'ibis'.*q:IQ/);
  assert.match(html, /class="lnk" href="https:\/\/support.google.com\/maps\/answer\/6291838\?co=GENIE.Platform%3DiOS&amp;hl=zh-Hant" target="_blank" rel="noopener">下載教學/);
  assert.ok(!html.includes('D2 雙溫室、D3 遇雨改去 ION'));
  assert.match(html, /D2 午後已安排國家博物館避暑；D3 Sentosa 遇雨時請開啟下雨模式/);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
  assert.equal(manifest.background_color.toLowerCase(), html.match(/--paper:(#[\da-fA-F]+);/)[1].toLowerCase());
});

test('Singapore calendar boundaries, countdown and four trip dates', () => {
  assert.equal(state('2026-10-04T16:00:00Z').daysLeft, 3);
  assert.equal(state('2026-10-07T15:59:59Z').kind, 'before');
  assert.equal(state('2026-10-07T15:59:59Z').daysLeft, 1);
  for (let i = 0; i < 4; i++) {
    const s = state('2026-10-' + String(7 + i).padStart(2, '0') + 'T16:00:00Z');
    assert.equal(s.kind, 'during');
    assert.equal(s.day.id, 'd' + (i + 1));
    assert.equal(s.clock, '00:00');
  }
  assert.equal(state('2026-10-11T15:59:59Z').kind, 'during');
  assert.equal(state('2026-10-11T16:00:00Z').kind, 'after');
});

test('current item, next item and gaps use actual itinerary times', () => {
  let s = state('2026-10-09T01:35:00Z');
  assert.equal(s.current.id, 'd2-bf');
  assert.equal(s.current.option.id, 'c');
  assert.equal(s.next.id, 'd2-ct');
  s = state('2026-10-09T02:05:00Z');
  assert.equal(s.current, null);
  assert.equal(s.next.id, 'd2-ct');
  assert.equal(state('2026-10-09T05:50:00Z').current.id, 'd2-mid');
  assert.equal(state('2026-10-09T05:50:00Z').current.option.id, 'e');
});

test('unresolved choices do not fabricate a destination', () => {
  const s = state('2026-10-08T13:30:00Z');
  assert.equal(s.current.id, 'd1-dinner');
  assert.equal(s.current.unresolved, true);
  assert.equal(s.current.destination, null);
});

test('cross-midnight supper stays attached to the previous evening', () => {
  assert.equal(C.range('約 23:15–00:30').end, 1470);
  const s = state('2026-10-08T16:10:00Z');
  assert.equal(s.day.id, 'd2');
  assert.equal(s.carry.dayCode, 'D1');
  assert.match(s.carry.title, /BBQ Box/);
  assert.equal(state('2026-10-08T16:30:00Z').carry, null);
});

test('untimed activities and final arrival are not assigned invented times', () => {
  const s = state('2026-10-10T14:30:00Z');
  assert.ok(s.pending.includes('d3-home'));
  assert.equal(C.range('深夜').start, null);
  assert.equal(state('2026-10-11T08:31:00Z').current, null);
});

test('chosen departure and changed evening window affect the live schedule', () => {
  let s = state('2026-10-11T00:20:00Z', { 'd4-go': 'b' });
  assert.equal(s.current.id, 'd4-go');
  assert.equal(s.current.start, 495);
  s = state('2026-10-10T23:50:00Z', { 'd4-go': 'c' });
  assert.equal(s.current.id, 'd4-go');
  assert.equal(s.current.start, 465);
  assert.notEqual(s.next.id, 'd4-out');
  s = state('2026-10-09T09:40:00Z', { 'd2-eve': 'a' });
  assert.equal(s.current.id, 'd2-eve');
  assert.equal(s.current.start, 1050);
});

test('hotel groups are parallel and unknown links never become exact durations', () => {
  const map = [{ id: 'D1', stops: [
    { itemId: 'd1-jewel', name: 'Jewel', q: 'Jewel Singapore', t: '20:20–21:15',
      leg: { mode: 'walk', to: 'Jewel', min: '約 5–10 分鐘（官方指引）' } },
    { itemId: 'd1-in', name: 'Hotel 81（兄弟組）', q: 'Hotel 81 Singapore', type: 'hotel' },
    { itemId: 'd1-in', name: 'ibis budget（夫妻組）', q: 'ibis budget Singapore', type: 'hotel' }
  ] }];
  const d = C.buildDays(trip, choose(), map)[0];
  const hotels = d.route.find(s => s.parallel);
  assert.equal(hotels.stops.length, 2);
  assert.equal(d.route.filter(s => s.parallel).length, 1);
  const jewel = d.route.find(s => s.itemId === 'd1-jewel');
  const leg = C.routeLeg(d, jewel, hotels);
  assert.equal(leg.mode, 'mrt');
  assert.equal(leg.duration, 60);
  const unknown = C.routeLeg({ entries: [] }, { index: 0, stops: [], name: 'A' }, { index: 1, stops: [], name: 'B' });
  assert.equal(unknown.mode, 'unknown');
  assert.equal(unknown.duration, null);
  assert.match(C.legLabel(unknown), /尚未確認/);
  assert.ok(!C.directions('B', 'unknown', 'A').includes('travelmode='));
});

test('rain recommendations reuse existing choices and leave them unchanged', () => {
  const d = C.buildDays(trip, choose(), [])[2];
  const original = JSON.stringify(trip);
  const points = id => id === 'd3-kg' ? [{ name: 'Kampong Glam', q: 'Kampong Glam', shelter: 'outdoor' }] : [];
  const suggestions = C.rainRecommendations(d, points);
  const fixed = suggestions.find(r => r.original.id === 'd3-kg');
  assert.match(fixed.title, /YY Kafei Dian/);
  const evening = suggestions.find(r => r.original.id === 'd3-eve');
  assert.ok(d.source.items.find(i => i.id === 'd3-eve').opts.some(o => o.title === evening.title));
  assert.match(evening.note, /不在原本同一區/);
  assert.match(evening.move, /從目前地點前往備選地點的交通與時間尚未確認/);
  assert.equal(evening.mode, 'unknown');
  assert.match(fixed.move, /從目前地點提前前往的交通與時間尚未確認/);
  assert.equal(JSON.stringify(trip), original);
});

test('outgoing transport from the destination is not reused as an incoming leg', () => {
  const from = { index: 0, stops: [{ leg: { mode: 'mrt', to: 'Sentosa（Singapore Oceanarium）', min: '約 30 分鐘' } }] };
  const to = { index: 1, name: '喜園', q: 'YY Kafei Dian Singapore', stops: [{ leg: { mode: 'mrt', to: 'Singapore Oceanarium', min: '約 30 分鐘' } }],
    entry: { places: [], title: '喜園', option: { move: '從 Beach Road 前往 Sentosa' } } };
  const result = C.routeLeg({ entries: [] }, from, to);
  assert.equal(result.mode, 'unknown');
  assert.equal(result.duration, null);
  assert.match(result.detail, /這兩站之間/);
});

test('a mixed stop keeps its existing indoor portion and rain transport uses an existing option', () => {
  const d2 = C.buildDays(trip, choose(), [])[1];
  const points = id => id === 'd2-temple' ? [
    { name: '觀音堂', q: 'Temple', shelter: 'mixed' },
    { name: 'Fortune Centre', q: 'Fortune Centre Singapore', shelter: 'indoor' }
  ] : [];
  assert.equal(C.rainRecommendations(d2, points).find(r => r.original.id === 'd2-temple').title, 'Fortune Centre');
  const d1 = C.buildDays(trip, choose(), [])[0];
  assert.match(C.rainRecommendations(d1, () => []).find(r => r.original.id === 'd1-ride').title, /Grab/);
});

test('a timed sub-stop sends the traveler to the fireworks, not back to the Luge', () => {
  const mapped = [{ id: 'D3', stops: [
    { itemId: 'd3-eve', name: 'Skyline Luge', q: 'Luge', t: '下午', leg: { mode: 'walk', to: 'Wings of Time', min: null } },
    { itemId: 'd3-eve', name: 'Wings of Time', q: 'Wings of Time', t: '19:40', stay: '約 20 分鐘' }
  ] }];
  let s = C.status(trip, choose(), new Date('2026-10-10T11:30:00Z'), mapped);
  assert.equal(s.next.title, 'Wings of Time');
  assert.equal(s.next.destination, 'Wings of Time');
  assert.equal(C.legForEntry(s.day, s.next.id, s.next.destination).mode, 'walk');
  s = C.status(trip, choose(), new Date('2026-10-10T11:50:00Z'), mapped);
  assert.equal(s.current.destination, 'Wings of Time');
  s = C.status(trip, choose(), new Date('2026-10-10T12:10:00Z'), mapped);
  assert.equal(s.current.destination, null);
  assert.match(s.current.title, /已過預定時段/);
});

test('Day 4 defaults to 08:15 Grab/taxi and keeps MRT as an explicitly chosen backup', () => {
  const day = C.buildDays(trip, choose(), [])[3];
  const ride = day.entries.find(e => e.id === 'd4-go');
  assert.equal(ride.option.id, 'b');
  assert.match(ride.title, /Grab／計程車/);
  assert.equal(ride.start, 495);
  assert.equal(day.entries.find(e => e.id === 'd4-out').end, 495);
  assert.equal(day.entries.find(e => e.id === 'd4-arr').start, 525);
  assert.match(C.departure(ride, C.legForEntry(day, ride.id)), /08:15/);
  const arrival = day.entries.find(e => e.id === 'd4-arr');
  const hotels={index:0,stops:[],name:'各自住宿'},airport={index:2,stops:[],name:'Changi T3'};
  assert.match(C.departure(arrival,C.routeLeg(day,hotels,airport)),/08:15/);
  assert.equal(C.legForEntry(day, ride.id).mode, 'grab');
  assert.match(state('2026-10-11T00:10:00Z').next.title, /Grab/);
  assert.match(state('2026-10-11T00:20:00Z', {'d4-go':'a'}).next.title, /MRT 備援/);
  const backup=state('2026-10-11T01:00:00Z', {'d4-go':'a'});
  assert.equal(backup.current.id,'d4-go');
  assert.equal(backup.next.id,'d4-arr');
  assert.equal(backup.next.displayTime,'09:30–09:45');
  assert.equal(backup.day.entries.find(e=>e.id==='d4-ck').start,585);
  assert.ok(!/主計畫.{0,10}08:30 搭 MRT|Day 2 早上買 Gardens/.test(html));
});

test('numbered map hotel origins stay one parallel stop when rebuilding companion models', () => {
  const hotels = [
    {name:'Hotel 81（兄弟組）',q:'Hotel 81',type:'hotel',parallel:true,branch:0,n:1,act:'兄弟組出發；夫妻組各自出發'},
    {name:'ibis（夫妻組）',q:'ibis',type:'hotel',parallel:true,branch:1,n:1,act:'兄弟組出發；夫妻組各自出發'}
  ];
  const day = C.buildDays(trip, choose(), [{id:'D2',stops:hotels}])[1];
  assert.equal(day.route.filter(s=>s.index===-1).length,1);
  assert.equal(day.route[0].parallel,true);
  assert.equal(day.route[0].stops.length,2);
});

test('Rain Mode focuses on current/upcoming activities and excludes finished outdoor slots', () => {
  const day=C.buildDays(trip,choose(),[])[2];
  const recs=C.rainRecommendations(day,()=>[]);
  const live={kind:'during',day,clock:'17:00',current:day.entries.find(e=>e.id==='d3-eve')};
  const focused=C.focusRain(day,recs,live);
  assert.match(focused.title,/Oceanarium/);
  assert.match(focused.rejoin,/Beach Station/);
  assert.equal(focused.original.id,'d3-eve');
  assert.equal(C.focusRain(day,recs,{kind:'during',day,clock:'23:30',current:null}),null);
  assert.ok(C.focusRain(day,recs,{kind:'before'}));
});
