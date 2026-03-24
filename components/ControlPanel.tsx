import React from 'react';
import { PlotData, PlotKey, BuildingStats } from '../types';
import { CONFIG, BONUSES_DATA } from '../constants';

interface ControlPanelProps {
  plotA: PlotData;
  plotB: PlotData;
  onUpdate: (key: PlotKey, field: 'bcr' | 'far', value: number) => void;
  onOpenBonus: (key: PlotKey) => void;
}

const getBuildingStats = (data: PlotData): BuildingStats => {
  // We duplicate this logic from ThreeScene only for display purposes. 
  // In a real Redux app, this would be a selector.
  const cellCount = data.bcr; 
  if (cellCount <= 0 || data.far <= 0) {
      return { 
        valid: false, widthM: 0, depthM: 0, widthCells: 0, depthCells: 0, 
        wholeFloors: 0, remainder: 0, footprintArea: 0, totalFloorArea: 0, displayFloors: 0 
      };
  }

  // Same helper logic
  const getDims = (c: number) => {
    let bestW = 1, bestD = c, minDiff = Infinity;
    for (let w = 1; w <= Math.sqrt(c); w++) {
        if (c % w === 0) {
            let d = c / w;
            if (d <= 10 && w <= 10 && (d - w) < minDiff) {
                minDiff = d - w; bestW = w; bestD = d;
            }
        }
    }
    return { w: bestW, d: bestD };
  }

  const dims = getDims(cellCount);
  const footprintArea = (dims.w * 10) * (dims.d * 10);
  const totalFloorArea = (CONFIG.landSize ** 2) * (data.far / 100);
  let floors = totalFloorArea / footprintArea;
  const wholeFloors = Math.floor(floors);
  const remainder = floors - wholeFloors;

  return {
      valid: true,
      widthM: dims.w * 10,
      depthM: dims.d * 10,
      widthCells: dims.w,
      depthCells: dims.d,
      wholeFloors,
      remainder,
      footprintArea,
      totalFloorArea,
      displayFloors: remainder > 0.01 ? wholeFloors + 1 : wholeFloors
  };
};

const PlotCard: React.FC<{
  plotKey: PlotKey;
  data: PlotData;
  onUpdate: (field: 'bcr' | 'far', value: number) => void;
  onOpenBonus: () => void;
  colorTheme: 'blue' | 'red';
}> = ({ plotKey, data, onUpdate, onOpenBonus, colorTheme }) => {
  const stats = getBuildingStats(data);
  const themeClasses = colorTheme === 'blue' ? {
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', 
    labelBg: 'bg-blue-500', subText: 'text-blue-700', ring: 'focus:ring-blue-500', 
    inputBorder: 'border-blue-300', inputColor: 'text-blue-800', btnBorder: 'border-blue-300',
    btnText: 'text-blue-600', btnHover: 'hover:bg-blue-100',
    statsBg: 'border-blue-100', statsText: 'text-blue-900'
  } : {
    bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', 
    labelBg: 'bg-red-500', subText: 'text-red-700', ring: 'focus:ring-red-500',
    inputBorder: 'border-red-300', inputColor: 'text-red-800', btnBorder: 'border-red-300',
    btnText: 'text-red-600', btnHover: 'hover:bg-red-100',
    statsBg: 'border-red-100', statsText: 'text-red-900'
  };

  const activeBonuses = data.bonuses.map(id => BONUSES_DATA.find(b => b.id === id)).filter(Boolean);

  return (
    <div className={`flex-1 ${themeClasses.bg} border ${themeClasses.border} rounded-lg p-4 relative hover:bg-${colorTheme}-50/80 transition-all duration-300`}>
      <div className={`absolute top-0 right-0 ${themeClasses.labelBg} text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg`}>
        {plotKey === 'a' ? '土地 A (藍色)' : '土地 B (紅色)'}
      </div>
      <h2 className={`font-bold ${themeClasses.text} mb-3`}>參數設定</h2>
      
      <div className="mb-2 grid grid-cols-2 gap-4">
        <div>
            <label className={`block text-sm font-semibold ${themeClasses.subText} mb-1`}>建蔽率 (%)</label>
            <input 
              type="number" 
              value={data.bcr || ''} 
              step="1" min="0" max="100"
              onChange={(e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 0;
                // Allow user to type freely, clamp within logic but not modulo
                val = Math.max(0, Math.min(100, val));
                onUpdate('bcr', val);
              }}
              className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded ${themeClasses.inputColor} font-bold focus:outline-none focus:ring-2 ${themeClasses.ring} text-center`}
              placeholder="0-100"
            />
        </div>
        <div>
            <label className={`block text-sm font-semibold ${themeClasses.subText} mb-1`}>總容積率 (%)</label>
            <input 
              type="number" 
              value={data.far || ''} 
              step="10" min="0"
              onChange={(e) => onUpdate('far', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded ${themeClasses.inputColor} font-bold focus:outline-none focus:ring-2 ${themeClasses.ring} text-center`}
              placeholder="輸入數值"
            />
        </div>
      </div>

      {activeBonuses.length > 0 && (
        <div className="mb-3 text-xs bg-yellow-50 p-3 rounded border border-yellow-200">
           <p className="font-bold text-yellow-800 mb-1">🎁 已套用容積獎勵項目：</p>
           <ul className="list-disc list-inside text-slate-700 mb-2">
             {activeBonuses.map(b => (
               <li key={b?.id}>{b?.label}</li>
             ))}
           </ul>
           <div className="pt-2 border-t border-yellow-200 flex justify-between items-center text-sm">
              <span className="text-slate-600">最終容積率：</span>
              <span className="font-bold text-red-600 text-base">{data.far}%</span>
           </div>
        </div>
      )}

      <div className={`bg-white p-3 rounded shadow-sm border ${themeClasses.statsBg} mt-2`}>
          <div className="flex justify-between text-sm mb-1 text-slate-700">
              <span>單層面積：</span>
              <span className="font-mono font-bold">{stats.valid ? `${stats.footprintArea} m² (${stats.widthCells}x${stats.depthCells}格)` : '0 m²'}</span>
          </div>
          <div className={`flex justify-between text-base font-bold ${themeClasses.statsText} border-t pt-2 mt-2`}>
              <span>目前樓層數：</span>
              <span className="text-xl">{stats.valid ? `${stats.displayFloors} 樓` : '0 樓'}</span>
          </div>
      </div>

      <button 
        onClick={onOpenBonus} 
        className={`mt-3 w-full py-2 border-2 border-dashed ${themeClasses.btnBorder} ${themeClasses.btnText} rounded ${themeClasses.btnHover} transition text-sm font-semibold`}
      >
          + 增加容積獎勵
      </button>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ plotA, plotB, onUpdate, onOpenBonus }) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <PlotCard 
        plotKey="a" 
        data={plotA} 
        onUpdate={(f, v) => onUpdate('a', f, v)} 
        onOpenBonus={() => onOpenBonus('a')} 
        colorTheme="blue" 
      />
      <PlotCard 
        plotKey="b" 
        data={plotB} 
        onUpdate={(f, v) => onUpdate('b', f, v)} 
        onOpenBonus={() => onOpenBonus('b')} 
        colorTheme="red" 
      />
    </div>
  );
};

export default ControlPanel;