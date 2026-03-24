import React, { useState, useEffect } from 'react';

const GeminiSettings: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex justify-between items-center mb-2">
             <h3 className="text-xl font-bold flex items-center gap-2">
               <i className="fa-solid fa-key"></i>
               Gemini API 設定
             </h3>
             <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
               <i className="fa-solid fa-xmark text-xl"></i>
             </button>
          </div>
          <p className="text-blue-100 text-sm">
            請輸入您的 Gemini API Key 以啟用 AI 輔助功能。
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">API Key</label>
            <div className="relative">
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="在此輸入您的 API Key..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              * 金鑰將安全地儲存在您的瀏覽器 (localStorage) 中，不會傳送到伺服器。
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
              <i className="fa-solid fa-circle-info"></i>
              如何取得 API Key？
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              1. 前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google AI Studio</a><br />
              2. 點擊 "Create API key"<br />
              3. 複製並貼上到上方輸入框
            </p>
          </div>

          <button 
            onClick={handleSave}
            disabled={!apiKey}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
              isSaved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
            } ${!apiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaved ? (
              <>
                <i className="fa-solid fa-check"></i>
                已儲存成功！
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i>
                儲存設定
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiSettings;
