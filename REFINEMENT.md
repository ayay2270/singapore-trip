# Practical refinement · feature/travel-companion

The supplied D1–D4 plan remains authoritative. MRT colors, typography, themes, option selection, localStorage, the existing map renderer, and Singapore timezone handling are preserved. No merge into main.

## 1. Inconsistencies fixed

- Home, four-day descriptions, flight notes, Transport, D4 default transport, checkout/arrival/check-in times, day heading, map notes, Today and departure guidance now agree: checkout at 08:00, Grab/taxi at 08:15, target T3 arrival at 08:45. MRT is an explicit backup. A selected backup adjusts derived arrival and check-in times; its early-checkout warning remains visible in collapsed confirmations.
- Removed the mandatory D2 morning Gardens ticket task. Gardens, Garden Rhapsody, Botanic Gardens, bus 7 and older dining combinations remain labelled options/research.
- Corrected option text that assumed lunch in Bugis. Main D2 lunch stays in Chinatown; National Museum follows.
- Food's Fortune Centre lunch label, Maxwell assumption, Little India and Bugis meal labels no longer imply the old main plan. Fortune Centre is the later D2 area; YY is D3 lunch.
- Corrected the Sentosa lunch option's map record, which previously pointed to Bugis Food Junction.
- Old Gardens/HaveFun cost totals are labelled and collapsed as an old option budget, not the current trip total. Checklist card reminders only refer to cards actually carried.
- HaveFun stays a D3 option, never D1. Harry Potter stays optional. Existing brothers-only BBQ Box remains clearly marked optional without changing saved choices.
- The separate old guide has an archive banner linking to the authoritative current guide. Sources' obsolete coordinate coverage and misleading “not planned” heading were updated.

## 2. Home and Money hierarchy

Home leads with Today, Singapore time, current activity, the next destination, departure and navigation. Confirmations expand from a count. The existing four-day strip remains; mobile hero text is more compact. Accommodation, flight and checklist have quick links. Detailed hotel information, payment, weather forecasts, emergencies, dietary context, regional research and general planning notes remain in “更多旅行資訊” and expand for printing.

Money leads with actual payment needs: card selection is still unspecified, contactless transit reminders, S$800 already exchanged and SGD instead of TWD. Card comparisons and old budget calculations remain secondary.

## 3. Daily Route

One ordered station list with compact transport labels, tappable names that open the existing itinerary, and one map action. Removed repeated place/detail/navigation buttons per stop. Unverified travel times remain unverified. Both hotels form one parallel stop.

## 4. Map

The existing renderer now consumes the same derived ordered route as the summary. Numbers match, including shared hotel numbers and repeated places. Hotel branches connect to the next shared stop rather than to each other. Connections are itinerary-order diagrams; unknown legs or gaps across unlocated stops are dashed and labelled. Unlocated places remain in numbered cards, with no fabricated coordinates.

Added fixed positions verified through SLA OneMap address search on 2026-10-05 for ibis, Kitchener Complex, National Museum, Fortune Centre, YY's address, Luge, Wings of Time and T3. These are building/attraction positions, not verified entrances. Chinatown's unselected lunch venue uses an explicitly labelled neighborhood reference. No directions/geocoding API runs in the app.

## 5. Rain Mode

Opening Rain Mode scrolls directly to one current/upcoming affected activity, its existing indoor/sheltered alternative, navigation and where to rejoin. Entry conditions and other options expand separately. All-day contingencies are collapsed. Sentosa's focused advice reuses today's Oceanarium and visibly warns to confirm re-entry if already visited. Finished outdoor slots are excluded. Selection persistence is unchanged.

Official nowcast access: [Meteorological Service Singapore 2-hour nowcast](https://www.weather.gov.sg/weather-forecast-2hrnowcast-2/). Static advance forecasts are secondary.

## 6. Mobile navigation

Primary controls: 首頁、地圖、D1、D2、D3、D4、更多. More opens the existing food, transport, money, insurance, checklist and source panels. The current-day button remains visually marked; the original sticky/safe-area behavior and 44px controls remain.

## 7. Offline/PWA

Manifest, 192/512px local icons and a small versioned service worker cache only the essential local app shell. The embedded guide includes all four itineraries, hotel addresses, flight data, emergency contacts, checklists and dietary phrases. External maps/tiles/fonts are excluded. Network-first fetching prevents an online visit staying permanently stale; complete-shell installation, normal waiting-worker lifecycle and scoped cache cleanup preserve safe updates. Registration failures/unsupported browsers are handled. A status note reports offline availability.

## 8. Files

- `index.html`, `travel-companion.js`, `travel-companion.css`: audited content and existing interface/map refinements.
- `guide-v2-old-plan-with-map.html`: archive notice only.
- `manifest.json`, `service-worker.js`, `icon-192.png`, `icon-512.png`: offline/PWA shell.
- `scripts/preview.cjs`: local JSON/PNG MIME support; `scripts/make-icons.cjs`: reproducible local icon generation.
- `tests/companion.test.cjs`, `tests/offline.test.cjs`, `tests/mobile.cjs`: regression coverage.
- `README.md`, `REFINEMENT.md`, `.gitignore`: usage, validation record and local-artifact exclusions.

## 9. Validation

- Existing 11 tests preserved; 19 combined logic/service-worker tests pass.
- Chromium checks at 390×844, 430×932 and 1280×900: D1–D4 summaries/map numbering, parallel hotels, all Home phases, Rain Mode, menu/quick links, horizontal overflow, dark mode and option persistence.
- Real browser offline reload after successful installation: all embedded guide content and route/map markers remain usable; no page JavaScript errors. External fonts/tiles blocked during UI checks also exercise fallback behavior.
- Print expansion/restoration verified; closed details do not omit hotel/flight/emergency/research information when printing.
- Service-worker tests cover unsupported/blocked registration, rejected incomplete install, stale-cache cleanup, online refresh, offline navigation and exclusion of external services.
- Screenshots and machine-readable browser results remain in local `artifacts/`. This is Chromium viewport testing; physical iPhone/Safari validation is still advisable.

## 10. Decisions still open

No further itinerary redesign decision is needed. Existing unresolved details remain explicit: D1 Jewel dinner choice, D3 return time, actual primary/backup cards, vegetarian/vegan and allium requirements, ticket/opening/entry confirmation, and whether to choose Harry Potter or HaveFun. Some optional venues remain unmapped; the guide keeps their Google Maps links. These were preserved instead of inventing destinations, times or prices.
