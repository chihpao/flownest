# FlowNest — 輕量專注計時器（Vue 3 + Three.js）

乾淨好用的專注計時器：中間一顆會「呼吸」的球（Three.js），外圈進度環，時間到跳完成頁。UI 走簡潔、手機優先，平板/桌機也順。

## 功能

* **時間選擇**：預設 30 / 45 / 60 分鐘，可自訂。
* **呼吸球**：柔和不干擾（Three.js）。
* **進度環**：環繞呼吸球，剩餘一目了然。
* **一鍵停止**：中途 Stop 會直接到完成頁。
* **RWD**：手機、平板、桌機自適應。

## 快速開始

### 環境需求

* Node.js 18+

### 安裝

```bash
npm install
```

### 本機開發

```bash
npm run dev
```

打開瀏覽器到：[http://localhost:3000](http://localhost:5173)

### 打包

```bash
npm run build
```

### 預覽打包產物

```bash
npm run preview
```

## 頁面與路由

* `/`：Welcome（標題＋插圖＋進入）
* `/setup`：選擇專注時間（預設 + 自訂）
* `/timer`：倒數頁（上方時間、中間呼吸球、外圈進度環）
* `/done`：完成頁（顯示完成分鐘數、返回）

## 主要檔案

* `src/pages/FocusSetupPage.vue`：選時間頁（修改預設 30/45/60 的 `choices`）。
* `src/pages/FocusTimerPage.vue`：倒數頁（時間顯示＋`.progress-ring` 樣式）。
* `src/components/ThreeBreathingSphere.vue`：呼吸球（Three.js 場景；顏色/光澤/大小可調）。
* `src/components/useCountdown.ts`：倒數邏輯（start/stop/剩餘秒/格式化）。
* `src/router/index.ts`：路由設定。

## 技術堆疊

* 前端：Vue 3、TypeScript、Vite、Vue Router
* 樣式：Tailwind CSS
* 3D/動畫：Three.js（WebGL）

<div align="center">
