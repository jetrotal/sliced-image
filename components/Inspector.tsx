import React from 'react';
import { Axis, TileMap, TileMode, NSliceConfig } from '../types';
import { getEffectiveTileMode } from '../utils/math';
import { Trash2, Plus, Info, Lock, Maximize2, Download, Upload } from 'lucide-react';

interface InspectorProps {
  xAxes: Axis[];
  yAxes: Axis[];
  tiles: TileMap;
  rowScaling: boolean[];
  colScaling: boolean[];
  onUpdateX: (axes: Axis[]) => void;
  onUpdateY: (axes: Axis[]) => void;
  onUpdateTiles: (tiles: TileMap) => void;
  onToggleRowScaling: (index: number) => void;
  onToggleColScaling: (index: number) => void;
  onDeleteAxis: (id: string, type: 'x' | 'y') => void;
  onAddAxis: (type: 'x' | 'y') => void;
  selectedAxisId: string | null;
  selectedAxisType: 'x' | 'y' | null;
  jsonOutput: string;
  onLoadJson: (config: NSliceConfig) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  xAxes,
  yAxes,
  tiles,
  rowScaling,
  colScaling,
  onUpdateX,
  onUpdateY,
  onUpdateTiles,
  onToggleRowScaling,
  onToggleColScaling,
  onDeleteAxis,
  onAddAxis,
  selectedAxisId,
  selectedAxisType,
  jsonOutput,
  onLoadJson
}) => {
  
  // We only need the counts for the grid, sorting is not required for rendering the grid structure
  const numRows = yAxes.length + 1;
  const numCols = xAxes.length + 1;

  const handleTileChange = (row: number, col: number, mode: TileMode) => {
    const key = `${row}-${col}`;
    onUpdateTiles({
      ...tiles,
      [key]: { mode }
    });
  };

  const getAxisValue = (id: string, type: 'x' | 'y') => {
    const axes = type === 'x' ? xAxes : yAxes;
    return axes.find(a => a.id === id)?.value.toFixed(2) || "0";
  };

  const updateAxisValue = (id: string, type: 'x' | 'y', newVal: string) => {
    const val = parseFloat(newVal);
    if (isNaN(val)) return;
    const clamped = Math.min(100, Math.max(0, val));
    
    if (type === 'x') {
      onUpdateX(xAxes.map(a => a.id === id ? { ...a, value: clamped } : a));
    } else {
      onUpdateY(yAxes.map(a => a.id === id ? { ...a, value: clamped } : a));
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sliced-picture.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation check
        if (json && Array.isArray(json.xAxes) && Array.isArray(json.yAxes)) {
           onLoadJson(json as NSliceConfig);
        } else {
           alert("Invalid Sliced Picture configuration file.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          Sliced Picture Inspector
          <span className="text-xs font-normal text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">V3</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Selected Axis Editor */}
        {selectedAxisId && selectedAxisType ? (
          <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase text-cyan-400">
                   {selectedAxisType.toUpperCase()} Axis Selected
                </span>
                <button 
                  onClick={() => onDeleteAxis(selectedAxisId, selectedAxisType)}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-zinc-700"
                  title="Delete Axis"
                >
                  <Trash2 size={14} />
                </button>
             </div>
             <div className="flex items-center gap-2">
               <label className="text-xs text-zinc-400 w-12">Pos %</label>
               <input 
                  type="number" 
                  step="0.1"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  value={getAxisValue(selectedAxisId, selectedAxisType)}
                  onChange={(e) => updateAxisValue(selectedAxisId, selectedAxisType, e.target.value)}
               />
             </div>
          </div>
        ) : (
           <div className="bg-zinc-800/20 p-3 rounded-lg border border-zinc-800 text-center">
             <span className="text-xs text-zinc-500">Select an axis on canvas to edit</span>
           </div>
        )}

        {/* Axes List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-zinc-300">Axes Configuration</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => onAddAxis('x')}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors border border-zinc-700"
            >
              <Plus size={12} /> Add X-Axis (Col)
            </button>
             <button 
              onClick={() => onAddAxis('y')}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors border border-zinc-700"
            >
              <Plus size={12} /> Add Y-Axis (Row)
            </button>
          </div>
        </div>

        {/* Tiles Matrix */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-zinc-300">Segments & Tiles</h3>
            <div className="group relative">
               <Info size={12} className="text-zinc-500 hover:text-zinc-300 cursor-help" />
               <div className="absolute right-0 top-4 w-56 p-3 bg-zinc-950 border border-zinc-700 rounded shadow-xl text-[10px] text-zinc-400 hidden group-hover:block z-50 leading-relaxed">
                  <p className="mb-2"><strong className="text-zinc-200">Grid Scaling:</strong> Click row/col headers to toggle between Fixed (Lock) and Scalable (Arrow).</p>
                  <p><strong className="text-zinc-200">Tile Mode:</strong> Click a tile to change how the image fills that cell.</p>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
             {/* Header Row (Column Scaling Toggles) */}
             <div className="flex gap-1 ml-6">
                {Array.from({ length: numCols }).map((_, c) => {
                   const isScalable = colScaling[c];
                   return (
                     <button
                       key={`col-head-${c}`}
                       onClick={() => onToggleColScaling(c)}
                       className={`flex-1 h-6 rounded flex items-center justify-center text-[10px] transition-colors border ${
                         isScalable 
                           ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200' 
                           : 'bg-blue-900/30 text-blue-200 border-blue-800/50 hover:bg-blue-900/50'
                       }`}
                       title={isScalable ? "Column Scales" : "Column Fixed"}
                     >
                       {isScalable ? <Maximize2 size={10} className="rotate-90" /> : <Lock size={10} />}
                     </button>
                   );
                })}
             </div>

             {/* Grid Body */}
             {Array.from({ length: numRows }).map((_, r) => {
               const isRowScalable = rowScaling[r];
               return (
                 <div key={`row-${r}`} className="flex gap-1">
                    {/* Sidebar Column (Row Scaling Toggle) */}
                    <button
                       onClick={() => onToggleRowScaling(r)}
                       className={`w-5 h-8 rounded flex items-center justify-center text-[10px] transition-colors border ${
                         isRowScalable 
                           ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200' 
                           : 'bg-blue-900/30 text-blue-200 border-blue-800/50 hover:bg-blue-900/50'
                       }`}
                       title={isRowScalable ? "Row Scales" : "Row Fixed"}
                     >
                       {isRowScalable ? <Maximize2 size={10} /> : <Lock size={10} />}
                     </button>

                    {/* Tiles */}
                    {Array.from({ length: numCols }).map((_, c) => {
                       const effectiveMode = getEffectiveTileMode(tiles, r, c);
                       
                       // Symbol mapping
                       const symbol = {
                         [TileMode.Fixed]: 'F',
                         [TileMode.Stretch]: 'S',
                         [TileMode.Repeat]: 'R',
                         [TileMode.Hidden]: 'H'
                       }[effectiveMode];

                       // Visual Style based on Tile Mode
                       let tileStyle = '';
                       if (effectiveMode === TileMode.Fixed) {
                          tileStyle = 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
                       } else if (effectiveMode === TileMode.Hidden) {
                          tileStyle = 'bg-zinc-900 border-zinc-800 text-zinc-600';
                       } else if (effectiveMode === TileMode.Repeat) {
                          tileStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                       } else {
                          // Stretch
                          tileStyle = 'bg-zinc-800 border-zinc-700 text-zinc-300';
                       }

                       return (
                         <div key={`tile-${r}-${c}`} className="flex-1 relative group">
                            <div className={`h-8 w-full border rounded flex items-center justify-center text-[10px] cursor-pointer hover:border-cyan-500 transition-colors ${tileStyle}`}>
                               {symbol}
                            </div>
                            
                            <select 
                              value={effectiveMode}
                              onChange={(e) => handleTileChange(r, c, e.target.value as TileMode)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              title={`Row ${r}, Col ${c}: ${effectiveMode}`}
                            >
                              <option value={TileMode.Fixed}>Fixed</option>
                              <option value={TileMode.Stretch}>Stretch</option>
                              <option value={TileMode.Repeat}>Repeat</option>
                              <option value={TileMode.Hidden}>Hidden</option>
                            </select>
                         </div>
                       )
                    })}
                 </div>
               )
             })}
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500/10 border border-indigo-500/30 rounded flex items-center justify-center text-[8px] text-indigo-400">F</div> Fixed Mode</div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-[8px] text-zinc-300">S</div> Stretch Mode</div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center justify-center text-[8px] text-emerald-400">R</div> Repeat Mode</div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-[8px] text-zinc-600">H</div> Hidden</div>
          </div>
        </div>

        {/* JSON Output */}
        <div className="pt-4 border-t border-zinc-800">
           <div className="flex justify-between items-center mb-2">
             <h3 className="text-xs font-semibold text-zinc-300">JSON Output</h3>
             <div className="flex gap-2">
                <button 
                  onClick={handleDownload}
                  className="text-[10px] flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition-colors px-2 py-1 hover:bg-zinc-800 rounded"
                  title="Download JSON"
                >
                   <Download size={12} /> Export
                </button>
                <label className="text-[10px] flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition-colors px-2 py-1 hover:bg-zinc-800 rounded cursor-pointer" title="Import JSON">
                   <Upload size={12} /> Import
                   <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
                </label>
             </div>
           </div>
           <textarea 
             readOnly
             value={jsonOutput}
             className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] font-mono text-cyan-600 focus:outline-none resize-none"
           />
        </div>
      </div>
    </div>
  );
};