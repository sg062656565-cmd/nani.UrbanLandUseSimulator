import React, { useState, useEffect } from 'react';
import BlockSimulator from './components/BlockSimulator';
import CitySimulator from './components/CitySimulator';
import GeminiSettings from './components/GeminiSettings';
import GeminiAssistant from './components/GeminiAssistant';
import LandingPage from './components/LandingPage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'block' | 'city'>('block');
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    setHasApiKey(!!savedKey);
  }, []);

  const handleKeySubmit = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setHasApiKey(true);
  };

  if (hasApiKey === null) return null; // Loading state

  if (!hasApiKey) {
    return <LandingPage onKeySubmit={handleKeySubmit} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50 animate-in fade-in duration-700">
      {/* Top Navigation Bar (Floating & Collapsible) */}
      <div 
        className={`absolute top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out transform ${
            isNavVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-3 shadow-md flex items-center justify-between relative">
             <div className="flex items-center gap-4">
                 <div className="font-bold text-lg text-slate-800 flex items-center gap-2">
                     <i className="fa-solid fa-map-location-dot text-blue-600"></i>
                     <span>都市土地利用模擬器</span>
                 </div>
                 <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
                 <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setActiveTab('block')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'block' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <i className="fa-solid fa-cubes mr-2"></i>
                      建蔽率與容積率
                    </button>
                    <button 
                      onClick={() => setActiveTab('city')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === 'city' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <i className="fa-solid fa-city mr-2"></i>
                      都市土地規畫模擬器
                    </button>
                 </div>
             </div>
             <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all text-sm font-medium"
                    title="API 設定"
                 >
                    <i className="fa-solid fa-gear"></i>
                    <span className="hidden sm:inline">設定</span>
                 </button>
                 <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>
                 <div className="text-xs text-gray-400 hidden sm:block">
                     v1.2.0
                 </div>
                 <button 
                    onClick={() => setIsNavVisible(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    title="隱藏選單"
                 >
                    <i className="fa-solid fa-chevron-up"></i>
                 </button>
             </div>
        </div>
      </div>

      {/* Expand Button (Visible when nav is hidden) */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
            isNavVisible ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
          <button 
            onClick={() => setIsNavVisible(true)}
            className="bg-white/90 backdrop-blur text-gray-600 shadow-md border-b border-x border-gray-200 rounded-b-lg px-4 py-1 hover:bg-white hover:text-blue-600 transition-all text-xs font-bold flex items-center gap-2"
          >
            <i className="fa-solid fa-bars"></i> 展開選單
          </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full h-full relative overflow-hidden">
        {activeTab === 'block' ? <BlockSimulator /> : <CitySimulator />}
      </div>

      {/* Gemini Components */}
      <GeminiSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <GeminiAssistant activeTab={activeTab} />
    </div>
  );
};

export default App;