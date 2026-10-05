# 新加坡 4天3夜自由行指南（2026/10/8–10/11）

## 線上預覽

[開啟 Travel Companion 預覽版](https://raw.githack.com/ayay2270/singapore-trip/refs/heads/feature/travel-companion/index.html)

- 正式版網站：[https://ayay2270.github.io/singapore-trip/](https://ayay2270.github.io/singapore-trip/)
- Branch：`feature/travel-companion`
- 本分支為實驗功能版本，不影響正式版。
- 今日／現在要做什麼：以新加坡時間判斷旅行前倒數、當日行程與旅行完成狀態，提示目前時段、下一站及導航。
- 每日路線：站名可直接開啟詳細時段，以簡短交通段理解動線；地圖與路線共用同一份編號，兩組住宿同號分流。
- 下雨模式：優先顯示目前／接下來受影響活動，全日方案與細節預設收起；可開啟 MSS 官方 2 小時即時天氣。建議層不會自動改動已選備案。
- Home：今日狀態、四天 strip、住宿／航班／清單快速入口；詳細旅行資訊收進「更多旅行資訊」。
- D4 主計畫：08:00 完成退房、08:15 Grab／計程車、目標 08:45 到 T3；MRT 為備援。選擇備援會同步調整 Today、詳細抵達時段與路線。
- 離線：首次成功連線並顯示「指南已可離線閱讀」後，可離線開啟行程、住宿、航班、緊急電話、清單與飲食溝通卡。Google Maps、外部連結、底圖仍需連線。

預覽透過 raw.githack 直接讀取本分支的公開靜態檔案，不更動 GitHub Pages 的 `main` 部署設定，也沒有新增 Pages／Actions 部署。第一次開啟可能先出現第三方的目的地確認頁；確認後即可瀏覽。分支更新可能需要幾分鐘才反映，這個網址僅供實驗預覽。

### 本機預覽與驗證

不需安裝套件或新增後端；使用 Node.js：

```sh
node scripts/preview.cjs
```

開啟 [本機預覽](http://127.0.0.1:8765/index.html#home)。

```sh
node --test tests/companion.test.cjs tests/offline.test.cjs
```

測試直接讀取 `index.html` 的實際行程，涵蓋新加坡日期邊界、出發前／旅行中／完成狀態、跨午夜宵夜、未定時段、變更交通出發時間、兩組住宿分流、下雨備案與煙火場次。

瀏覽器回歸測試：在本機伺服器以 `--test-clock` 啟動後，執行 `node tests/mobile.cjs`。需有 Playwright 與 Chromium；可用 `PLAYWRIGHT_PATH` 指定已安裝 Playwright 模組的絕對路徑，`CHROME_PATH` 指定 Chrome 執行檔。本網站本身沒有新增套件依賴。測試涵蓋 390×844、430×932 與桌面，包括離線重新載入；截圖與報告寫入未追蹤的 `artifacts/`。

PWA 需要 HTTPS 或 localhost，以及瀏覽器允許 service worker。快取只包含本地 app shell，使用網路優先與離線回退；新 worker 必須完整下載 shell 才能安裝，版本更新只清理自己的舊快取，不強制重載使用中的指南。修改 shell 時請更新 `service-worker.js` 的 `CACHE` 版本。raw.githack 是第三方預覽，離線能力仍依其標頭與瀏覽器支援而定；若儲存不可用，介面會提示，指南仍可在線閱讀。

若需在瀏覽器模擬不同日期，以 `node scripts/preview.cjs --test-clock` 啟動本機伺服器，再開啟下列連結。模擬時鐘只存在於這個選擇性啟用的本機測試工具；公開網站一律使用真實的新加坡時間。

- [出發前](http://127.0.0.1:8765/index.html?at=2026-10-05T02%3A00%3A00Z#home)
- [旅行中：第二天](http://127.0.0.1:8765/index.html?at=2026-10-09T01%3A35%3A00Z#home)
- [旅行完成](http://127.0.0.1:8765/index.html?at=2026-10-12T02%3A00%3A00Z#home)

實作入口：`travel-companion.js`（共用衍生資料與互動）、`travel-companion.css`（沿用原網站設計的樣式）。既有 `TRIP`、`SGPLAN` 和 `SGMAP` 仍是行程與地圖資料來源。

- `index.html`：最新版指南（主計畫＋備選，含互動地圖）。這是網站首頁。
- `guide-v2-old-plan-with-map.html`：封存舊版研究，頁首標明不適用目前主計畫並連回 `index.html`。

本分支首頁搭配 `travel-companion.js` 與 `travel-companion.css`，不需要建置；舊版研究内容保留並加上封存提示。原行程資料查證日：2026-10-04。

本次稽核與驗證記錄：[REFINEMENT.md](REFINEMENT.md)。新增固定建築／景點座標核對日：2026-10-05。
