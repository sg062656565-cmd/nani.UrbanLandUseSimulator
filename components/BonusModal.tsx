import React, { useMemo } from 'react';
import { BONUSES_DATA } from '../constants';
import { PlotData, PlotKey } from '../types';

interface BonusModalProps {
  isOpen: boolean;
  target: PlotKey | null;
  plotData: PlotData;
  onClose: (newBonuses: string[], newFar: number) => void;
}

const BonusModal: React.FC<BonusModalProps> = ({ isOpen, target, plotData, onClose }) => {
  const [selectedBonuses, setSelectedBonuses] = React.useState<string[]>([]);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedBonuses(plotData.bonuses);
    }
  }, [isOpen, plotData.bonuses]);

  const handleToggle = (id: string) => {
    setSelectedBonuses(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    // Calculate difference
    let oldVal = 0;
    plotData.bonuses.forEach(bid => {
        const b = BONUSES_DATA.find(x => x.id === bid);
        if(b) oldVal += b.val;
    });

    let newVal = 0;
    selectedBonuses.forEach(bid => {
        const b = BONUSES_DATA.find(x => x.id === bid);
        if(b) newVal += b.val;
    });

    const diff = newVal - oldVal;
    const newFar = Math.max(0, plotData.far + diff);
    
    onClose(selectedBonuses, newFar);
  };

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-2xl transform transition-all scale-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
          <span className="bg-gray-200 px-2 py-0.5 rounded text-sm text-slate-700">
            {target === 'a' ? '土地 A' : '土地 B'}
          </span>
          容積獎勵方案
        </h3>
        <p className="text-xs text-gray-500 mb-4">勾選後，獎勵數值將自動加總至目前的容積率中。</p>
        
        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
          {BONUSES_DATA.map(bonus => (
            <div 
              key={bonus.id}
              onClick={() => handleToggle(bonus.id)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 cursor-pointer transition-colors"
            >
              <input 
                type="checkbox" 
                checked={selectedBonuses.includes(bonus.id)}
                readOnly
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
              />
              <label className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                {bonus.label}
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button 
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            確定加入並計算
          </button>
        </div>
      </div>
    </div>
  );
};

export default BonusModal;