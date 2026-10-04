# 新加坡 4天3夜自由行指南（2026/10/8–10/11）

## 線上預覽

[開啟 Travel Companion 預覽版](https://raw.githack.com/ayay2270/singapore-trip/refs/heads/feature/travel-companion/index.html)

- 正式版網站：[https://ayay2270.github.io/singapore-trip/](https://ayay2270.github.io/singapore-trip/)
- Branch：`feature/travel-companion`
- 本分支為實驗功能版本，不影響正式版。
- 今日／現在要做什麼：以新加坡時間判斷旅行前倒數、當日行程與旅行完成狀態，提示目前時段、下一站及導航。
- 每日路線：沿用目前主計畫、已選備案與地圖資料，依順序顯示地點、交通方式及移動時間；兩組住宿分流顯示。
- 下雨模式：顯示既有室內／避雨備案、前往方式及雨停後如何接回行程；開關建議層不會自動改動已選備案。

預覽透過 raw.githack 直接讀取本分支的公開靜態檔案，不更動 GitHub Pages 的 `main` 部署設定，也沒有新增 Pages／Actions 部署。第一次開啟可能先出現第三方的目的地確認頁；確認後即可瀏覽。分支更新可能需要幾分鐘才反映，這個網址僅供實驗預覽。

### 本機預覽與驗證

不需安裝套件或新增後端；使用 Node.js：

```sh
node scripts/preview.cjs
```

開啟 [本機預覽](http://127.0.0.1:8765/index.html#home)。

```sh
node --test tests/companion.test.cjs
```

測試直接讀取 `index.html` 的實際行程，涵蓋新加坡日期邊界、出發前／旅行中／完成狀態、跨午夜宵夜、未定時段、變更交通出發時間、兩組住宿分流、下雨備案與煙火場次。

若需在瀏覽器模擬不同日期，以 `node scripts/preview.cjs --test-clock` 啟動本機伺服器，再開啟下列連結。模擬時鐘只存在於這個選擇性啟用的本機測試工具；公開網站一律使用真實的新加坡時間。

- [出發前](http://127.0.0.1:8765/index.html?at=2026-10-05T02%3A00%3A00Z#home)
- [旅行中：第二天](http://127.0.0.1:8765/index.html?at=2026-10-09T01%3A35%3A00Z#home)
- [旅行完成](http://127.0.0.1:8765/index.html?at=2026-10-12T02%3A00%3A00Z#home)

實作入口：`travel-companion.js`（共用衍生資料與互動）、`travel-companion.css`（沿用原網站設計的樣式）。既有 `TRIP`、`SGPLAN` 和 `SGMAP` 仍是行程與地圖資料來源。

- `index.html`：最新版指南（主計畫＋備選，含互動地圖）。這是網站首頁。
- `guide-v2-old-plan-with-map.html`：保留的舊版指南，含互動地圖。

本分支首頁搭配 `travel-companion.js` 與 `travel-companion.css`，不需要建置；舊版指南維持原檔案。原行程資料查證日：2026-10-04。
