<div align="center">

# FlowNest — 輕量專注計時器（Vue 3 + Three.js）

這個專案是個乾淨、好用的「專注計時器」。畫面中央是一顆會跟著節奏呼吸的球（Three.js），外面有進度環，時間到就跳到完成頁。整個 UI 走簡潔路線，手機、平板、桌機都能順順用。

功能

- 選擇專注時間：預設 30/45/60 分鐘，或自訂。
- 會呼吸的球：柔和、不卡眼，但有存在感（Three.js）。
- 進度環：環繞呼吸球，清楚知道剩多少。
- 一鍵 Stop：中途停止會帶去完成頁，方便結束一次 session。
- 響應式：小到手機、大到桌機，都會調整排版與尺寸。

快速開始

1) 安裝

   - 需要 Node.js（建議 18+）
   - 安裝相依套件：
     ```bash
     npm install
     ```
2) 開發模式（本機）

   ```bash
   npm run dev
   ```

   打開瀏覽器看 http://localhost:5173
3) 打包正式版

   ```bash
   npm run build
   ```
4) 預覽打包結果

   ```bash
   npm run preview
   ```

導覽說明（頁面與路由）

- `/`：Welcome 首頁（標題 + 插圖 + 進入按鈕）
- `/setup`：選擇專注時間（預設選項 + 自訂數字）
- `/timer`：倒數頁（上方顯示時間，中間是呼吸球，外圈進度環）
- `/done`：完成頁（顯示完成分鐘數，提供返回）

你可能會用到的檔案

- `src/pages/FocusSetupPage.vue`：選時間的頁面。如果要改預設選項（30/45/60），改這裡的 `choices` 即可。
- `src/pages/FocusTimerPage.vue`：倒數頁。時間顯示在球上方，進度環的 CSS 就在這個檔案底部（`.progress-ring`）。
- `src/components/ThreeBreathingSphere.vue`：呼吸球本體（Three.js 場景）。想改顏色、光澤、大小，這裡都調得到。
- `src/components/useCountdown.ts`：簡單的倒數邏輯（start/stop/剩餘秒數/格式化）。
- `src/router/index.ts`：路由設定。

技術堆疊

- 前端：Vue 3、TypeScript、Vite、Vue Router
- 樣式：Tailwind CSS
- 3D/動畫：Three.js（WebGL）
