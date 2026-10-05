(function (root, factory) {
  'use strict';
  var core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (root && root.document) {
    root.TravelCompanion = core;
    boot(root, core);
  }

  function boot(win, C) {
    var doc = win.document, T = win.TRIP, P = win.SGPLAN, M = win.SGMAP;
    if (!T || !P || !M) return;
    var rain = {}, lastClock = '';
    if (M.syncRoutes) M.syncRoutes(C);
    function node(tag, cls, text) {
      var el = doc.createElement(tag);
      if (cls) el.className = cls;
      if (text != null) el.textContent = text;
      return el;
    }
    function append(parent) {
      for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
      return parent;
    }
    function link(text, href, cls) {
      var a = node('a', cls || 'tc-action', text); a.href = href;
      if (/^https:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
      return a;
    }
    function button(text, action, day, item) {
      var b = node('button', 'tc-action', text);
      b.type = 'button'; b.dataset.tcAction = action; b.dataset.day = day;
      if (item) b.dataset.item = item;
      return b;
    }
    function models() { return C.buildDays(T, P.shown, M.days); }
    function refreshToday() {
      var host = doc.getElementById('travel-status'), state = C.status(T, P.shown, new Date(), M.days);
      var clockKey = JSON.stringify(state);
      if (clockKey === lastClock) return;
      var wasExpanded = host.querySelector('details') && host.querySelector('details').open;
      lastClock = clockKey; host.replaceChildren();
      doc.querySelectorAll('.nav .dy').forEach(function (a) {
        var today = state.kind === 'during' && a.getAttribute('href') === '#' + state.day.id;
        a.classList.toggle('tc-current-day', today);
        if (today) a.setAttribute('aria-label', state.day.code + ' 今天');
        else a.removeAttribute('aria-label');
      });
      var top = node('div', 'tc-top');
      append(top, node('h2', '', state.kind === 'before' ? '旅行即將開始' :
        state.kind === 'after' ? '新加坡旅行已完成' : '今日 · 第 ' + (state.day.index + 1) + ' 天'),
        node('p', 'tc-clock', '現在時間：' + state.clock + '（新加坡）'));
      host.appendChild(top);
      var actions = node('div', 'tc-actions');
      if (state.kind === 'before') {
        append(host, node('p', 'tc-destination', '距離新加坡旅行還有 ' + state.daysLeft + ' 天'),
          node('p', '', state.departDate.replace(/-/g, '/') + ' 出發'));
        append(actions, link('查看出發前清單', '#todo'), link('查看第一天行程', '#' + state.firstDay.id));
      } else if (state.kind === 'after') {
        append(host, node('p', '', '四天行程已結束，仍可查看每天的安排與已選備案。'));
        append(actions, link('查看完整旅程紀錄', '#' + state.firstDay.id), link('查看旅程地圖', '#map'));
      } else {
        if (state.carry) host.appendChild(node('p', 'tc-context', '前一晚延續：' + state.carry.title + '（' + state.carry.dayCode + '）'));
        if (state.current) host.appendChild(node('p', 'tc-context', '目前時段：' + state.current.title));
        var target = state.next || state.current;
        var hotelEntry = [state.current, target].find(function (e) { return e && e.destinations; });
        if (hotelEntry) hotelEntry.destinations.forEach(function (hotel) {
          host.appendChild(node('p', 'tc-context', hotel.name));
        });
        if (state.next) {
          var nextName = state.next.title;
          if (state.next.source.transport) {
            var nextPlace = state.day.route.find(function (s) { return s.index > state.next.index; });
            nextName = state.next.destinations ? '各自住宿（兩組分流）' : nextPlace ? nextPlace.name : nextName;
          }
          host.appendChild(node('p', 'tc-destination', '下一站 → ' + nextName));
        }
        else host.appendChild(node('p', 'tc-destination', state.current ? '按目前行程進行' : '今日已排定時段結束'));
        if (state.next) {
          if (!state.next.source.transport) host.appendChild(node('p', '', '行程時間：' + state.next.displayTime));
          var leg = C.legForEntry(state.day, state.next.id, state.next.destination);
          var departure = C.departure(state.next, leg);
          host.appendChild(node('p', '', departure));
          host.appendChild(node('p', 'tc-context', '交通：' + C.legLabel(leg)));
        }
        var issues = state.day.warnings.concat(state.day.entries.filter(function (e) { return e.start == null || e.unresolved; })
          .map(function (e) { return e.title + '：' + (e.unresolved ? '地點尚未選定' : '時間尚未確認'); }));
        if (issues.length) {
          var notice = node('details', 'tc-notice');
          notice.open = !!wasExpanded;
          notice.appendChild(node('summary', '', '⚠ ' + issues.length + ' 項需確認'));
          issues.forEach(function (issue) { notice.appendChild(node('p', 'tc-context', issue)); });
          notice.appendChild(link('到今日行程確認', '#' + state.day.id, 'tc-place-link'));
          host.appendChild(notice);
        }
        if (target && target.unresolved) {
          append(host, node('p', 'tc-context', '這個時段尚未選定地點。'));
          actions.appendChild(button('選擇這個時段', 'item', state.day.id, target.id));
        } else if (target && target.destination) {
          actions.appendChild(link('開始導航', C.directions(target.destination, C.legForEntry(state.day, target.id, target.destination).mode)));
        } else if (target && target.destinations) {
          target.destinations.forEach(function (place) {
            actions.appendChild(link('開始導航：' + place.name, C.directions(place.q, C.legForEntry(state.day, target.id).mode)));
          });
        }
        actions.appendChild(link('查看今日行程', '#' + state.day.id));
        var rainLink = link('開啟下雨模式', '#' + state.day.id, 'tc-action tc-secondary');
        rainLink.dataset.tcAction = 'rain-link'; rainLink.dataset.day = state.day.id;
        actions.appendChild(rainLink);
      }
      host.appendChild(actions);
      if (state.kind === 'during') state.tomorrowReminders.forEach(function (reminder) {
        var note = node('p', 'tc-context tc-footnote tc-tomorrow', reminder);
        note.setAttribute('aria-label', '明日提醒'); host.appendChild(note);
      });
      if (state.kind === 'during') host.appendChild(node('p', 'tc-context tc-footnote', '依行程預定時間提示，沒有追蹤你的實際位置。'));
    }
    function renderDay(d) {
      var root = doc.querySelector('#' + d.id + ' .dayroot');
      if (!root) return;
      var old = root.querySelector('.tc-day');
      var expanded = old ? [].map.call(old.querySelectorAll('details'), function (detail) { return detail.open; }) : [];
      if (old) old.remove();
      var section = node('section', 'tc-day');
      section.setAttribute('aria-label', '每日路線與下雨建議');
      var heading = node('div', 'tc-top');
      var toggle = button(rain[d.id] ? '關閉下雨模式' : '開啟下雨模式', 'rain', d.id);
      toggle.id = 'tc-rain-toggle-' + d.id;
      toggle.setAttribute('aria-expanded', String(!!rain[d.id]));
      toggle.setAttribute('aria-controls', 'tc-rain-' + d.id);
      append(heading, node('h3', '', '今日路線'), toggle);
      append(section, heading, node('p', 'tc-context', '依主計畫與已選 OPTION 同步；點站名查看詳細行程。'));
      if (d.warnings.length) {
        var warnings = node('details', 'tc-notice'); warnings.appendChild(node('summary', '', '⚠ ' + d.warnings.length + ' 項時間提醒'));
        d.warnings.forEach(function (warning) { warnings.appendChild(node('p', 'tc-context', warning)); });
        section.appendChild(warnings);
      }
      if (rain[d.id]) section.appendChild(rainLayer(d));
      var list = node('ol', 'tc-route');
      if (!d.route.length) section.appendChild(node('p', '', '尚無可顯示的地點，請先查看這一天的行程選項。'));
      d.route.forEach(function (stop, i) {
        var li = node('li', 'tc-route-stop');
        append(li, node('span', 'tc-number', String(i + 1)), node('div', 'tc-route-place'));
        var place = li.lastChild;
        if (stop.itemId) {
          var nameButton = button(stop.name, 'item', d.id, stop.itemId); nameButton.className = 'tc-stop-link'; place.appendChild(nameButton);
        } else place.appendChild(node('h4', '', stop.name));
        if (stop.parallel) {
          stop.stops.forEach(function (hotel) { place.appendChild(node('p', 'tc-context', hotel.name)); });
        } else if (!stop.q) place.appendChild(node('p', 'tc-context', '地點尚未確認'));
        var next = d.route[i + 1];
        if (next) {
          var leg = C.routeLeg(d, stop, next);
          var move = node('div', 'tc-leg');
          append(move, node('p', '', '↓ ' + C.legLabel(leg)));
          li.appendChild(move);
        }
        list.appendChild(li);
      });
      section.appendChild(list);
      var mapLink = link('在地圖看今日路線', '#map', 'tc-action mapjump');
      mapLink.dataset.day = d.code;
      section.appendChild(mapLink);
      var first = root.querySelector('.stop');
      root.insertBefore(section, first || root.lastChild);
      section.querySelectorAll('details').forEach(function (detail, i) { detail.open = !!expanded[i]; });
    }
    function rainLayer(d) {
      var layer = node('section', 'tc-rain');
      layer.id = 'tc-rain-' + d.id;
      layer.setAttribute('aria-label', '下雨模式建議');
      append(layer, node('h4', '', '☔ 下雨模式'));
      layer.appendChild(link('🌧 查看新加坡即時 2 小時天氣', 'https://www.weather.gov.sg/weather-forecast-2hrnowcast-2/', 'tc-place-link'));
      var recommendations = C.rainRecommendations(d, M.placesFor);
      var live = C.status(T, P.shown, new Date(), M.days);
      var focused = C.focusRain(d, recommendations, live);
      if (!recommendations.length) {
        append(layer, node('p', '', '今天主要是室內活動或交通。先在目前有遮蔽的地方等候，戶外接駁仍要留意雨勢。'),
          node('p', 'tc-context', '沒有新增另一份行程；可在下方既有交通備選比較 MRT、Grab 等方案。'));
      }
      function blockFor(r, compact) {
        var block = node('div', 'tc-rain-option');
        append(block, node('p', 'tc-context', '目前／接下來受影響 · ' + r.original.displayTime),
          node('h4', '', r.original.title), node('p', 'tc-context', '建議替代 · 室內／遮蔽處'),
          node('h4', '', r.title));
        if (r.destination) block.appendChild(link('開始導航', C.directions(r.destination, r.mode)));
        var extra = compact ? node('details', 'tc-notice') : block;
        if (compact) extra.appendChild(node('summary', '', '其他選項／入場提醒'));
        append(extra, node('p', '', r.note), node('p', 'tc-context', '前往方式：' + r.move));
        if (r.slotId) extra.appendChild(button('查看這個時段的備選', 'item', d.id, r.slotId));
        var official = (r.original.option && r.original.option.maps || []).filter(function (m) {
          return /^https:/.test(m[1]) && !/google|waze/.test(m[1]);
        });
        official.forEach(function (m) { extra.appendChild(link('查看 ' + m[0], m[1], 'tc-place-link')); });
        if (compact) block.appendChild(extra);
        block.appendChild(node('p', 'tc-context', '雨停後：' + r.rejoin));
        return block;
      }
      if (focused) {
        layer.appendChild(blockFor(focused, true));
        if (/再次入場/.test(focused.note)) layer.appendChild(node('p', 'tc-context', '已去過海洋館：再次入場須確認；否則先留在目前遮蔽處。'));
      }
      else if (recommendations.length) layer.appendChild(node('p', '', '接下來沒有已排定的戶外時段；先留在有遮蔽的地方。'));
      if (recommendations.length) {
        var all = node('details', 'tc-disclosure'); all.appendChild(node('summary', '', '查看今日全部避雨方案'));
        recommendations.forEach(function (r) { all.appendChild(blockFor(r)); }); layer.appendChild(all);
      }
      append(layer, node('p', 'tc-context', '營業、門票、交通與戶外營運狀況請即時確認，雷雨時不要勉強走戶外段。'),
        button('返回原行程', 'rain', d.id));
      return layer;
    }
    function renderDays() { models().forEach(renderDay); }
    function showItem(dayId, itemId) {
      win.location.hash = dayId;
      win.requestAnimationFrame(function () {
        var item = doc.querySelector('#' + dayId + ' [data-item-id="' + itemId + '"]');
        if (!item) return;
        var details = item.querySelector('details.opts'); if (details) details.open = true;
        item.setAttribute('tabindex', '-1'); item.focus({ preventScroll: true });
        item.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
    doc.addEventListener('click', function (event) {
      var control = event.target.closest('[data-tc-action]'); if (!control) return;
      var day = control.dataset.day, action = control.dataset.tcAction;
      if (action === 'item') showItem(day, control.dataset.item);
      if (action === 'rain' || action === 'rain-link') {
        rain[day] = action === 'rain-link' || !rain[day];
        renderDays();
        if (rain[day]) win.requestAnimationFrame(function () {
          var layer = doc.getElementById('tc-rain-' + day);
          if (layer) layer.scrollIntoView({ block: 'start' });
        });
        if (action === 'rain') doc.getElementById('tc-rain-toggle-' + day).focus({ preventScroll: true });
      }
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var id = win.location.hash.slice(1);
      if (rain[id]) { rain[id] = false; renderDays(); doc.getElementById('tc-rain-toggle-' + id).focus({ preventScroll: true }); }
    });
    doc.addEventListener('sg:dec', function () { lastClock = ''; refreshToday(); renderDays(); });
    doc.getElementById('moreBtn').addEventListener('click', function () {
      var menu = doc.getElementById('moreNav'); menu.hidden = !menu.hidden;
      this.setAttribute('aria-expanded', String(!menu.hidden));
    });
    doc.addEventListener('click', function (event) {
      var quick = event.target.closest('[data-home-target]');
      if (quick) {
        doc.getElementById('home-more').open = true;
        win.requestAnimationFrame(function () { doc.getElementById(quick.dataset.homeTarget).scrollIntoView({ block: 'start' }); });
      }
      if (event.target.closest('.nav a')) closeMore();
      if (!event.target.closest('.nav')) closeMore();
    });
    function closeMore() { doc.getElementById('moreNav').hidden = true; doc.getElementById('moreBtn').setAttribute('aria-expanded', 'false'); }
    doc.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMore(); });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) refreshToday(); });
    win.addEventListener('focus', refreshToday);
    refreshToday(); renderDays();
    win.setInterval(function () { refreshToday(); if (Object.keys(rain).some(function (id) { return rain[id]; })) renderDays(); }, 30000);
    var offlineNote = node('p', 'tc-offline'); offlineNote.setAttribute('role', 'status');
    doc.querySelector('.tc-quick').after(offlineNote);
    C.registerOffline(win).then(function (registration) {
      if (!registration) { offlineNote.textContent = '離線儲存不可用；目前仍可在線閱讀。'; return; }
      offlineNote.textContent = '正在儲存離線指南…';
      win.navigator.serviceWorker.ready.then(function () {
        offlineNote.textContent = '指南已可離線閱讀；外部導航與地圖底圖需網路。';
      }).catch(function () { offlineNote.textContent = '離線指南尚未儲存；請保持連線再開啟一次。'; });
    });
  }
}(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  var DAY_MS = 86400000;
  var MODE = { walk: '步行', mrt: '搭乘 MRT', bus: '搭乘公車', grab: 'Grab', taxi: '計程車', unknown: '交通方式尚未確認' };
  function singaporeTime(date) {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    var values = {}; parts.forEach(function (p) { values[p.type] = p.value; });
    return { date: values.year + '-' + values.month + '-' + values.day,
      minute: Number(values.hour) * 60 + Number(values.minute), clock: values.hour + ':' + values.minute };
  }
  function minutes(text) {
    var match = String(text || '').match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }
  function range(text) {
    var clocks = String(text || '').match(/\d{1,2}:\d{2}/g) || [];
    var start = clocks.length ? minutes(clocks[0]) : null;
    var end = clocks.length > 1 ? minutes(clocks[1]) : null;
    if (start != null && end != null && end < start) end += 1440;
    return { start: start, end: end };
  }
  function formatMinute(n) {
    n = ((n % 1440) + 1440) % 1440;
    return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  }
  function firstPlace(maps) {
    return (maps || []).filter(function (m) { return !/^https?:/.test(m[1]); }).map(function (m) {
      return { name: m[0], q: m[1] };
    })[0] || null;
  }
  function dateFor(trip, day) {
    var year = trip.meta.dates.match(/\d{4}/)[0], md = day.date.match(/(\d{1,2})\/(\d{1,2})/);
    return year + '-' + md[1].padStart(2, '0') + '-' + md[2].padStart(2, '0');
  }
  function buildDays(trip, shown, mappedDays) {
    var hotels = [];
    (mappedDays || []).forEach(function (d) { d.stops.forEach(function (s) {
      if (s.type === 'hotel' && !hotels.some(function (h) { return h.q === s.q; })) hotels.push(s);
    }); });
    return trip.days.map(function (day, index) {
      var mapped = (mappedDays || []).find(function (d) { return d.id === day.code; });
      var stops = mapped ? mapped.stops : [];
      var entries = day.items.map(function (item, itemIndex) {
        var option = item.slot ? shown(item).opt : null;
        var title = item.slot ? option ? option.title : item.label : item.title;
        if (item.optional) title = 'OPTION · ' + title;
        var time = item.t, timing = range(time);
        if (option && /^\s*(?:約\s*)?\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/.test(option.time || '')) {
          time = option.time; timing = range(time);
        }
        if (item.transport && option && /出發/.test(option.title)) {
          var selectedStart = minutes(option.title);
          if (selectedStart != null) { timing.start = selectedStart; timing.end = null; time = formatMinute(selectedStart) + ' 出發'; }
        }
        var places = stops.filter(function (s) { return s.itemId === item.id; });
        var fallback = firstPlace(option && option.maps || item.maps);
        var arrival = /抵達/.test(title) ? range(title) : null;
        var arrivalEnd = arrival && (arrival.end != null ? arrival.end : arrival.start);
        if (timing.end == null && timing.start != null && arrivalEnd != null && arrivalEnd > timing.start) timing.end = arrivalEnd;
        return { id: item.id, index: itemIndex, source: item, option: option, title: title, displayTime: time,
          start: timing.start, end: timing.end, area: option && option.area || item.area,
          unresolved: !!item.slot && !option, places: places,
          destination: places.length ? places[0].q : fallback && fallback.q };
      });
      var airportRide = entries.find(function (e) { return e.id === 'd4-go'; });
      if (airportRide && airportRide.option && airportRide.option.arrival) {
        var arrivalTime = range(airportRide.option.arrival);
        entries.forEach(function (e) {
          if (e.id === 'd4-arr') { e.start = arrivalTime.start; e.end = arrivalTime.end; e.displayTime = airportRide.option.arrival; }
          if (e.id === 'd4-ck') { e.start = arrivalTime.end; e.displayTime = formatMinute(e.start) + '–11:15'; }
        });
      }
      entries.forEach(function (e) {
        var next = entries[e.index + 1];
        if (hotels.length > 1 && (!e.source.slot && e.area === 'stay' ||
          e.source.transport && next && next.area === 'stay')) {
          e.destination = null; e.destinations = hotels.map(function (h) { return { name: h.name, q: h.q }; });
        }
        if (e.start == null || e.end != null) return;
        var later = entries.filter(function (n) { return n.start != null && n.start > e.start; });
        e.end = later.length ? Math.min.apply(null, later.map(function (n) { return n.start; })) : 1440;
        if (e.source.transport && e.option) {
          var duration = durationOf(e.option.time);
          if (duration != null) e.end = e.start + duration;
        }
      });
      var route = [];
      stops.filter(function (s) { return !s.itemId && (!s.parallel || s.branch === 0); }).forEach(function (s) {
        var separate = /兄弟組/.test(s.act || '') && /夫妻組/.test(s.act || '');
        route.push({ name: separate ? '各自住宿出發（兩組分流）' : s.name, context: s.act,
          time: s.t, q: separate ? null : s.q, stops: separate && hotels.length > 1 ? hotels : [s],
          parallel: separate && hotels.length > 1, leg: s.leg, entry: null, index: -1 });
      });
      entries.forEach(function (entry) {
        var points = entry.places;
        if (!entry.source.slot && entry.area === 'stay' && hotels.length > 1) points = hotels;
        if (!points.length && !entry.source.transport) {
          var place = firstPlace(entry.option && entry.option.maps || entry.source.maps);
          if (place) points = [place];
          else if (entry.source.slot && entry.unresolved) points = [{ name: entry.title, q: null }];
        }
        var parallel = points.length > 1 && points.every(function (s) { return s.type === 'hotel'; });
        (parallel ? [points] : points.map(function (p) { return [p]; })).forEach(function (group) {
          route.push({ name: parallel ? '各自住宿（兩組分流）' : (entry.source.optional && !/^OPTION/.test(group[0].name) ? 'OPTION · ' : '') + group[0].name,
            q: parallel ? null : group[0].q, time: parallel || group[0].t === entry.source.t ? entry.displayTime : group[0].t || entry.displayTime,
            itemId: entry.id, entry: entry, index: entry.index, parallel: parallel, stops: group });
        });
      });
      var warnings = [];
      entries.forEach(function (e, i) {
        var previous = entries[i - 1];
        if (e.source.transport && previous && e.start != null && previous.end != null && e.start < previous.end) {
          warnings.push('時間提醒：所選交通於 ' + formatMinute(e.start) + ' 出發，比前一時段「' + previous.title +
            '」預定結束時間早，請提早完成準備。');
        }
      });
      return { id: day.id, code: day.code, index: index, date: dateFor(trip, day), source: day, entries: entries, route: route, warnings: warnings };
    });
  }
  function durationOf(text) {
    var m = String(text || '').match(/(?:約\s*)?(\d+)(?:[–\-至]\s*(\d+))?\s*分(?:鐘)?/);
    return m ? Number(m[2] || m[1]) : null;
  }
  function durationText(text) {
    var m = String(text || '').match(/(\d+(?:[–\-至]\s*\d+)?)\s*分(?:鐘)?/);
    return m ? '約 ' + m[1] + ' 分鐘' : null;
  }
  function modeOf(text) {
    text = text || '';
    if (/MRT.*Grab|Grab.*MRT|步行或|步行.*短程/.test(text)) return 'unknown';
    if (/Grab/i.test(text)) return 'grab';
    if (/計程車/.test(text)) return 'taxi';
    if (/公車|\bBus\b/i.test(text)) return 'bus';
    if (/MRT|EW 線|Sentosa Express/.test(text)) return 'mrt';
    if (/步行|走路/.test(text)) return 'walk';
    return 'unknown';
  }
  function matchesDestination(label, target) {
    if (!label || label === '下一站' || label === '下一個時段') return false;
    var candidate = [target.name, target.q, target.entry && target.entry.places.length <= 1 && target.entry.title].filter(Boolean).join(' ').toLowerCase();
    var stem = label.split(/[（(，,]/)[0].trim().toLowerCase();
    return stem.split(/[／/]/).some(function (part) {
      return part.trim().split(/\s+/).filter(function (word) { return word.length > 2 && word !== 'singapore'; })
        .some(function (word) { return candidate.indexOf(word) >= 0; });
    });
  }
  function routeLeg(day, from, to) {
    var transport = day.entries.find(function (e) {
      return e.source.transport && e.option && e.index > from.index && e.index <= to.index;
    });
    if (transport) {
      return { mode: modeOf(transport.option.title), duration: durationOf(transport.option.time),
        durationText: durationText(transport.option.time),
        detail: transport.option.move || '路線請依即時導航確認', certainty: '預估時間', departure: transport.start };
    }
    var points = from.stops, sourceLeg = from.leg || (points.length === 1 ? points[0].leg : null);
    // A map point's leg describes leaving that point, never arriving at it.
    var leg = matchesDestination(sourceLeg && sourceLeg.to, to) ? sourceLeg : null;
    if (leg) return { mode: leg.mode, duration: durationOf(leg.min), durationText: durationText(leg.min), detail: leg.min || '移動時間尚未確認',
      certainty: /官方/.test(leg.min || '') ? '官方指引' : '預估時間' };
    return { mode: 'unknown', duration: null, detail: '這兩站之間的交通方式與時間尚未確認，請查即時路線', certainty: '尚未確認' };
  }
  function legForEntry(day, id, destination) {
    var at = day.route.findIndex(function (s) { return s.itemId === id && (!destination || s.q === destination); });
    if (at > 0) return routeLeg(day, day.route[at - 1], day.route[at]);
    var e = day.entries.find(function (x) { return x.id === id; });
    if (e && e.source.transport && e.option) return {
      mode: modeOf(e.option.title), duration: durationOf(e.option.time), durationText: durationText(e.option.time), detail: e.option.move, certainty: '預估時間', departure: e.start
    };
    return { mode: 'unknown', duration: null, detail: '請依即時導航確認', certainty: '尚未確認' };
  }
  function legLabel(leg) {
    return (MODE[leg.mode] || MODE.unknown) + ' · ' + (leg.duration == null ? '移動時間尚未確認' :
      (leg.durationText || '約 ' + leg.duration + ' 分鐘') + '（' + leg.certainty + '）');
  }
  function departure(entry, leg) {
    if (entry.source.transport) return '行程預定 ' + formatMinute(entry.start) + ' 出發';
    if (leg.departure != null) return '建議 ' + formatMinute(leg.departure) + ' 出發（沿用已選交通時段）';
    if (leg.duration != null && entry.start != null) return '建議 ' + formatMinute(entry.start - leg.duration) + ' 前出發（依移動時間上限推估，另留候車緩衝）';
    return '建議出發：依即時導航確認';
  }
  function registerOffline(win) {
    if (!win.navigator || !win.navigator.serviceWorker || !win.isSecureContext) return Promise.resolve(null);
    // Scope stays relative so a repository/subdirectory preview works too.
    try { return win.navigator.serviceWorker.register('./service-worker.js', { scope: './', updateViaCache: 'none' }).catch(function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  }
  function focusRain(day, recommendations, state) {
    var during = state.kind === 'during' && state.day.id === day.id;
    var minute = during ? minutes(state.clock) : null;
    var r = recommendations.find(function (r) {
      if (during && state.current && r.original.id === state.current.id && /已過預定時段/.test(state.current.title)) return false;
      return minute == null || r.original.end == null || r.original.end > minute;
    });
    if (!r) return null;
    r = Object.assign({}, r);
    if (during && state.current && state.current.id === r.original.id) r.original = state.current;
    if (r.original.area === 'sentosa' && !/Wings of Time.*已過|已過.*Wings of Time/.test(r.original.title)) {
      var affected = r.original.places.find(function (p) { return p.shelter === 'outdoor' && /Luge/.test(p.name); });
      if (affected && !/Wings of Time/.test(r.original.title.replace(/＋.*$/, ''))) r.original = Object.assign({}, r.original, { title: affected.name });
    }
    // Reuse today's existing Sentosa indoor stop rather than sending a wet traveler back across town.
    if (r.original.area === 'sentosa') {
      var indoorStop = day.entries.find(function (e) { return e.area === 'sentosa' && indoor(e.option); });
      if (indoorStop) {
        r.title = indoorStop.title; r.destination = indoorStop.destination; r.slotId = indoorStop.id;
        r.note = '室內 · 沿用今日海洋館；若已參觀，先確認是否可再次入場，否則暫留目前遮蔽處。';
        r.move = '交通方式／時間尚未確認，請查即時導航'; r.mode = 'unknown';
        r.rejoin = '接回 Beach Station／Wings of Time；先確認 Luge 與演出的營運及剩餘時間。';
      }
    }
    return r;
  }
  function directions(q, mode, origin) {
    var modes = { walk: 'walking', mrt: 'transit', bus: 'transit', grab: 'driving', taxi: 'driving' };
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) +
      (origin ? '&origin=' + encodeURIComponent(origin) : '') + (modes[mode] ? '&travelmode=' + modes[mode] : '');
  }
  function status(trip, shown, now, mappedDays) {
    var sg = singaporeTime(now), days = buildDays(trip, shown, mappedDays), first = days[0], last = days[days.length - 1];
    var base = { clock: sg.clock, date: sg.date, firstDay: { id: first.id }, departDate: first.date };
    if (sg.date < first.date) return Object.assign(base, { kind: 'before', daysLeft: Math.round((Date.parse(first.date) - Date.parse(sg.date)) / DAY_MS) });
    if (sg.date > last.date) return Object.assign(base, { kind: 'after' });
    var day = days.find(function (d) { return d.date === sg.date; });
    var scheduled = day.entries.filter(function (e) { return e.start != null; }).sort(function (a, b) { return a.start - b.start; });
    var current = scheduled.filter(function (e) { return e.start <= sg.minute && sg.minute < e.end; })
      .sort(function (a, b) { return a.index - b.index; }).pop() || null;
    var next = scheduled.find(function (e) { return e.start > sg.minute && (!current || e.index > current.index); }) || null;
    // Exact times on existing map sub-stops (e.g. Wings of Time) refine a broad slot.
    if (current && current.places.length > 1 && !current.destinations) {
      var original = current;
      var substops = original.places.filter(function (p) { return /^(?:約\s*)?\d{1,2}:\d{2}$/.test(p.t || ''); })
        .map(function (p) { return { point: p, start: minutes(p.t) }; });
      var subNext = substops.filter(function (s) { return s.start > sg.minute; }).sort(function (a, b) { return a.start - b.start; })[0];
      var subCurrent = substops.filter(function (s) { return s.start <= sg.minute; }).sort(function (a, b) { return a.start - b.start; }).pop();
      if (subNext && (!next || subNext.start < next.start)) next = Object.assign({}, original, {
        title: subNext.point.name, destination: subNext.point.q, start: subNext.start, displayTime: subNext.point.t
      });
      if (subCurrent) {
        var duration = durationOf(subCurrent.point.stay), passed = duration != null && sg.minute >= subCurrent.start + duration;
        current = Object.assign({}, original, {
          title: subCurrent.point.name + (passed ? '（已過預定時段，請確認後續安排）' : ''),
          destination: passed ? null : subCurrent.point.q
        });
      }
    }
    var previous = days[day.index - 1], carry = null;
    if (previous) {
      var overnight = previous.entries.find(function (e) { return e.end > 1440 && sg.minute < e.end - 1440; });
      if (overnight) carry = { title: overnight.title, dayCode: previous.code };
    }
    var tomorrow = days[day.index + 1];
    var tomorrowReminders = tomorrow && tomorrow.entries.some(function (e) {
      // Explicit actual-entry metadata: a distant view of a mosque does not trigger preparation.
      return e.source.templeVisit || e.option && e.option.templeVisit;
    }) ? ['👖 明天有寺廟行程：記得準備長褲＋包鞋'] : [];
    return Object.assign(base, { kind: 'during', day: day, current: current, next: next, carry: carry, tomorrowReminders: tomorrowReminders,
      pending: day.entries.filter(function (e) { return e.start == null; }).map(function (e) { return e.id; }) });
  }
  function indoor(option) {
    return !!option && /室內|商場內|可躲雨/.test(option.wx || '') && !/室內外|半戶外|半室內|混合/.test(option.wx || '');
  }
  function rainRecommendations(day, placesFor) {
    var results = [];
    day.entries.forEach(function (original, index) {
      var places = placesFor(original.id, original.option && original.option.id);
      var outdoor = places.some(function (p) { return p.shelter === 'outdoor' || p.shelter === 'mixed'; }) ||
        /戶外|露天|室內外|混合/.test(original.option && original.option.wx || '');
      if (!outdoor) return;
      var shelter = places.find(function (p) { return p.shelter === 'indoor'; });
      var alternative = original.source.slot && original.source.opts.filter(function (o) {
        return o !== original.option && (indoor(o) || original.source.transport && /不受天氣影響/.test(o.wx || ''));
      })
        .sort(function (a, b) { return Number(b.area === original.area) - Number(a.area === original.area); })[0];
      var future = day.entries.slice(index + 1).find(function (e) { return indoor(e.option); });
      var rejoin = day.entries[index + 1];
      var result = { original: original, title: '', destination: null, mode: 'unknown', slotId: null,
        move: '交通方式與時間尚未確認，請查即時導航',
        rejoin: rejoin ? '視雨勢與時間接回「' + rejoin.title + '」；若已過時段，直接查看後續行程。' : '依剩餘時間返回原行程，或結束當天安排。' };
      if (shelter) {
        result.title = shelter.name; result.destination = shelter.q;
        result.note = '先保留這個時段已有的室內部分，戶外散步與找水果可等雨停後再決定。';
        result.move = '沿用同一時段的地點；步行與遮蔽路段尚未確認，請查即時導航';
      } else if (alternative) {
        var altPlaces = placesFor(original.id, alternative.id), fallback = firstPlace(alternative.maps);
        result.title = alternative.title; result.destination = altPlaces.length ? altPlaces[0].q : fallback && fallback.q;
        result.slotId = original.id; result.move = alternative.move || result.move; result.mode = modeOf(result.move);
        if (!original.source.transport && alternative.area !== original.area) {
          result.move = '從目前地點前往備選地點的交通與時間尚未確認，請查即時導航。抵達後的既有安排：' + (alternative.move || '請查看這個時段的備選。');
          result.mode = 'unknown';
        }
        result.note = (original.source.transport ? '沿用這個時段已有的避雨交通備選。' : '沿用這個時段已有的室內備選。') +
          (alternative.area !== original.area ? '地點不在原本同一區，移動與營業時間需先確認。' : '仍請確認營業與入場條件。');
      } else if (future) {
        result.title = future.title; result.destination = future.destination; result.slotId = future.source.slot ? future.id : null;
        result.note = '可考慮提前前往今日已排的室內行程；請先確認營業、預約、門票與是否能提早入場。';
        result.move = '從目前地點提前前往的交通與時間尚未確認，請查即時導航。既有行程交通說明：' + (future.option.move || '尚未確認');
        result.rejoin = '回到「' + original.title + '」，或依剩餘時間接續「' + future.title + '」；避免重複走訪。';
      } else {
        result.title = '暫留目前有遮蔽的地方';
        result.note = '這個時段沒有已確認的室內備選；先暫停戶外段，別把未查證的店家當成一定營業。';
      }
      results.push(result);
    });
    return results;
  }
  return { singaporeTime: singaporeTime, range: range, buildDays: buildDays, status: status, routeLeg: routeLeg,
    legForEntry: legForEntry, legLabel: legLabel, departure: departure, directions: directions, rainRecommendations: rainRecommendations,
    focusRain: focusRain, registerOffline: registerOffline };
}));
