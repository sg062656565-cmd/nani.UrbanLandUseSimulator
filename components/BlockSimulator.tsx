import React, { useState, useRef } from 'react';
import ThreeScene from './ThreeScene';
import ControlPanel from './ControlPanel';
import BonusModal from './BonusModal';
import { PlotData, PlotKey, SceneRef } from '../types';

const BlockSimulator: React.FC = () => {
  const sceneRef = useRef<SceneRef>(null);
  
  const [plotA, setPlotA] = useState<PlotData>({ bcr: 0, far: 0, bonuses: [] });
  const [plotB, setPlotB] = useState<PlotData>({ bcr: 0, far: 0, bonuses: [] });
  
  const [modalState, setModalState] = useState<{ isOpen: boolean; target: PlotKey | null }>({
    isOpen: false,
    target: null
  });

  const handleUpdatePlot = (key: PlotKey, field: 'bcr' | 'far', value: number) => {
    let finalValue = value;
    if (field === 'bcr') {
       finalValue = Math.max(0, Math.min(100, finalValue));
    } else {
       finalValue = Math.max(0, finalValue);
    }

    if (key === 'a') {
      setPlotA(prev => ({ ...prev, [field]: finalValue }));
    } else {
      setPlotB(prev => ({ ...prev, [field]: finalValue }));
    }
  };

  const handleOpenBonus = (key: PlotKey) => {
    setModalState({ isOpen: true, target: key });
  };

  const handleCloseBonus = (newBonuses: string[], newFar: number) => {
    if (modalState.target === 'a') {
      setPlotA(prev => ({ ...prev, bonuses: newBonuses, far: newFar }));
    } else if (modalState.target === 'b') {
      setPlotB(prev => ({ ...prev, bonuses: newBonuses, far: newFar }));
    }
    setModalState({ isOpen: false, target: null });
  };

  const handleResetCamera = () => {
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* 3D Scene Area */}
      <ThreeScene 
        ref={sceneRef}
        plotA={plotA} 
        plotB={plotB} 
      />

      {/* Dashboard UI */}
      <div 
        id="ui-container" 
        className="flex-1 bg-white border-t-4 border-blue-500 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] overflow-y-auto relative z-10"
        style={{ height: '40vh', minHeight: '300px' }}
      >
        <div className="p-4 max-w-7xl mx-auto">
          <header className="mb-4 flex justify-between items-center border-b border-gray-100 pb-2">
            <div>
                <h1 className="text-xl font-bold text-slate-800">🏗️ 建蔽率與容積率 3D 模擬教室</h1>
                <p className="text-sm text-slate-500">每格代表 1% 建蔽率 (10m x 10m) | 滑鼠移至建築可查看詳細資訊</p>
            </div>
            <button 
              onClick={handleResetCamera} 
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm transition font-medium"
            >
                重置視角
            </button>
          </header>

          <ControlPanel 
            plotA={plotA}
            plotB={plotB}
            onUpdate={handleUpdatePlot}
            onOpenBonus={handleOpenBonus}
          />
        </div>
      </div>

      <BonusModal 
        isOpen={modalState.isOpen}
        target={modalState.target}
        plotData={modalState.target === 'a' ? plotA : plotB}
        onClose={handleCloseBonus}
      />
    </div>
  );
};

export default BlockSimulator;