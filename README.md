# 都市土地利用模擬器 (Urban Land Use Simulator)

這是一個互動式的 3D 都市土地利用模擬工具，旨在幫助使用者理解「建蔽率」(BCR) 與「容積率」(FAR) 的概念，以及不同的都市發展模式。

## 功能特點

1. **建蔽率與容積率模擬**：
   - 互動式調整參數，即時查看 3D 建築變化。
   - 支援容積獎勵計算（如開放空間、綠建築等）。
   - 雙土地對照模式。

2. **都市土地規畫模擬**：
   - 模擬三大經典都市發展模式：同心圓模式、扇形模式、多核心模式。
   - 支援分區管制參數調整。
   - 包含細節模式與日夜切換功能。

3. **AI 規劃助手**：
   - 整合 Google Gemini AI，提供專業的都市計畫知識解答。

## 如何使用 AI 功能

本專案使用 Google Gemini API 提供 AI 輔助功能。為了確保安全性，API Key 不會硬編碼在程式碼中。

請按照以下步驟啟用：

1. 點擊頂部導覽列的 **「設定」** 按鈕。
2. 在彈出的視窗中輸入您的 **Gemini API Key**。
   - 您可以從 [Google AI Studio](https://aistudio.google.com/app/apikey) 免費取得 API Key。
3. 點擊 **「儲存設定」**。
4. 點擊右下角的 **機器人圖示** 即可開始與 AI 助手對話。

*註：您的 API Key 將儲存在瀏覽器的本地存儲 (localStorage) 中，僅供本網頁呼叫 API 使用。*

## 技術棧

- React 19
- Three.js (3D 渲染)
- Tailwind CSS (UI 樣式)
- Google Gemini API (@google/genai)
- Vite (構建工具)
