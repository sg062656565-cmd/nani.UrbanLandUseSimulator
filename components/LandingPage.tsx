import React, { useState } from 'react';

interface LandingPageProps {
  onKeySubmit: (key: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onKeySubmit }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length < 10) {
      setError('請輸入有效的 Gemini API Key');
      return;
    }
    onKeySubmit(key.trim());
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30 shadow-inner">
            <i className="fa-solid fa-city text-4xl"></i>
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">都市土地利用模擬器</h1>
          <p className="text-blue-100 text-sm font-medium">
            互動式 3D 都市計畫教學與模擬平台
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-blue-600"></i>
              啟用 AI 輔助功能
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              本模擬器整合了 Google Gemini AI 以提供專業的都市計畫建議。請輸入您的 API Key 以開始使用完整功能。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                Gemini API Key
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <i className="fa-solid fa-key"></i>
                </div>
                <input 
                  type="password" 
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setError('');
                  }}
                  placeholder="在此貼上您的 API Key..."
                  className={`w-full pl-11 pr-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-mono text-sm ${
                    error ? 'border-red-300 focus:border-red-500' : 'border-slate-100 focus:border-blue-500 focus:bg-white'
                  }`}
                />
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1 ml-1">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  {error}
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-circle-question"></i>
                如何取得金鑰？
              </h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-blue-900 transition-colors">Google AI Studio</a> 點擊 "Create API key" 並複製。金鑰將僅儲存在您的瀏覽器中。
              </p>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              進入模擬器
              <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              v1.2.0 | 專業都市計畫教學工具
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
