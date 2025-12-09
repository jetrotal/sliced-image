import React, { useState, useRef, useEffect } from 'react';
import { NSliceConfig, Axis, TileMap } from './types';
import { GridLines } from './components/GridLines';
import { Inspector } from './components/Inspector';
import { PreviewCanvas } from './components/PreviewCanvas';
import { generateDefaultScaling, getEffectiveTileMode } from './utils/math';
import { Upload, ImageIcon } from 'lucide-react';

// Use a static ID to ensure consistency between the <img> tag and the Image object
const DEFAULT_IMAGE_SRC = 'https://picsum.photos/id/20/400/400';
const DEFAULT_FILENAME = 'example.jpg';

function App() {
  // --- State ---
  const [imageSrc, setImageSrc] = useState<string>(DEFAULT_IMAGE_SRC);
  const [filename, setFilename] = useState<string>(DEFAULT_FILENAME);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  
  const [xAxes, setXAxes] = useState<Axis[]>([
    { id: 'x1', value: 33 },
    { id: 'x2', value: 66 }
  ]);
  const [yAxes, setYAxes] = useState<Axis[]>([
    { id: 'y1', value: 33 },
    { id: 'y2', value: 66 }
  ]);
  
  // Implicitly 3 segments for 2 axes.
  const [rowScaling, setRowScaling] = useState<boolean[]>([false, true, false]); // Fixed, Scale, Fixed
  const [colScaling, setColScaling] = useState<boolean[]>([false, true, false]); // Fixed, Scale, Fixed
  
  const [tiles, setTiles] = useState<TileMap>({});
  
  const [selectedAxis, setSelectedAxis] = useState<{ id: string, type: 'x' | 'y' } | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 400, height: 400 });
  
  // Track the actual rendered size of the editor container to sync grid lines
  const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });

  const editorRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      setImage(img);
      setPreviewSize({ width: img.width, height: img.height });
    };
  }, [imageSrc]);

  // Editor Resize Observer: Keeps GridLines in sync with the actual rendered image size
  useEffect(() => {
    const container = editorRef.current;
    if (!container || !image) return;

    // Set initial size immediately if available to prevent flicker
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setEditorSize({ width: rect.width, height: rect.height });
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setEditorSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [image]); // Re-bind when image object changes (new image loaded)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (typeof evt.target?.result === 'string') {
          setImageSrc(evt.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAxis = (type: 'x' | 'y') => {
    const newId = `${type}${Date.now()}`;
    const newAxis: Axis = { id: newId, value: 50 };
    
    if (type === 'x') {
      const newAxes = [...xAxes, newAxis];
      setXAxes(newAxes);
      // Initialize new segment scaling state. 
      const newSegmentIndex = newAxes.length; 
      setColScaling(prev => [...prev, newSegmentIndex % 2 !== 0]);
    } else {
      const newAxes = [...yAxes, newAxis];
      setYAxes(newAxes);
      const newSegmentIndex = newAxes.length; 
      setRowScaling(prev => [...prev, newSegmentIndex % 2 !== 0]);
    }
    
    setSelectedAxis({ id: newId, type });
  };

  const handleDeleteAxis = (id: string, type: 'x' | 'y') => {
    if (type === 'x') {
      setXAxes(xAxes.filter(a => a.id !== id));
      // Remove last scaling config to keep array size consistent with segments (axes + 1)
      setColScaling(prev => prev.slice(0, -1));
    } else {
      setYAxes(yAxes.filter(a => a.id !== id));
      setRowScaling(prev => prev.slice(0, -1));
    }
    
    if (selectedAxis?.id === id) setSelectedAxis(null);
  };
  
  const toggleRowScaling = (index: number) => {
    const newScaling = [...rowScaling];
    newScaling[index] = !newScaling[index];
    setRowScaling(newScaling);
  };
  
  const toggleColScaling = (index: number) => {
    const newScaling = [...colScaling];
    newScaling[index] = !newScaling[index];
    setColScaling(newScaling);
  };

  const generateJSON = () => {
    // Generate a dense map of all tiles so the JSON is complete
    const explicitTiles: TileMap = {};
    const sortedX = [...xAxes].sort((a, b) => a.value - b.value);
    const sortedY = [...yAxes].sort((a, b) => a.value - b.value);
    const numRows = sortedY.length + 1;
    const numCols = sortedX.length + 1;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const key = `${r}-${c}`;
        const mode = getEffectiveTileMode(tiles, r, c);
        explicitTiles[key] = { mode };
      }
    }

    const config: NSliceConfig = {
      filename,
      xAxes,
      yAxes,
      tiles: explicitTiles, // Use the dense map
      rowScaling,
      colScaling,
    };
    return JSON.stringify(config, null, 2);
  };

  const handleLoadJson = (config: NSliceConfig) => {
    if (config.filename) {
      setFilename(config.filename);
    }
    setXAxes(config.xAxes || []);
    setYAxes(config.yAxes || []);
    setTiles(config.tiles || {});
    
    // Safely update scaling arrays. 
    // If missing from JSON (e.g. legacy files), we should probably default them.
    // But since this app generates them, we can assume they exist or fallback to default pattern if undefined.
    if (config.rowScaling) {
      setRowScaling(config.rowScaling);
    } else {
      // Fallback: Generate standard pattern based on segment count
      setRowScaling(generateDefaultScaling((config.yAxes?.length || 0) + 1));
    }

    if (config.colScaling) {
      setColScaling(config.colScaling);
    } else {
      setColScaling(generateDefaultScaling((config.xAxes?.length || 0) + 1));
    }
    
    setSelectedAxis(null);
  };

  // Resize logic for preview container
  useEffect(() => {
    const container = previewContainerRef.current;
    if(!container) return;

    const observer = new ResizeObserver((entries) => {
      for(const entry of entries) {
        setPreviewSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);


  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
      
      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
              S
            </div>
            <h1 className="font-semibold text-lg tracking-tight">Sliced Picture</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <label className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md cursor-pointer transition-colors text-xs font-medium border border-zinc-700">
               <Upload size={14} />
               <span>Import Image</span>
               <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
             </label>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Editor View (Left/Top) */}
          <div className="flex-1 bg-zinc-900/50 flex flex-col relative overflow-hidden">
             <div className="absolute top-4 left-4 z-10 bg-zinc-950/80 px-2 py-1 rounded text-[10px] uppercase font-bold text-zinc-500 tracking-wider border border-zinc-800 backdrop-blur">
               Editor
             </div>
             <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
               {image ? (
                 <div 
                   ref={editorRef}
                   className="relative shadow-2xl shadow-black ring-1 ring-zinc-800"
                   style={{ 
                     width: image.width, 
                     height: image.height, 
                     maxWidth: '100%', 
                     maxHeight: '100%', 
                     aspectRatio: `${image.width}/${image.height}` 
                   }}
                 >
                    {/* Source Image */}
                    <img 
                      src={imageSrc} 
                      className="block w-full h-full object-contain pointer-events-none select-none" 
                      alt="Source"
                    />
                    
                    {/* Overlay Grid */}
                    <GridLines 
                      width={editorSize.width || image.width}
                      height={editorSize.height || image.height}
                      xAxes={xAxes}
                      yAxes={yAxes}
                      onUpdateX={setXAxes}
                      onUpdateY={setYAxes}
                      selectedAxisId={selectedAxis?.id || null}
                      onSelectAxis={(id, type) => setSelectedAxis(id && type ? {id, type} : null)}
                    />
                 </div>
               ) : (
                 <div className="text-zinc-500 flex flex-col items-center animate-pulse">
                   <ImageIcon size={48} className="mb-2 opacity-50"/>
                   Loading Image...
                 </div>
               )}
             </div>
          </div>

          {/* Divider */}
          <div className="h-px lg:h-full lg:w-px bg-zinc-800"></div>

          {/* Preview View (Right/Bottom) */}
          <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-zinc-950 flex flex-col relative">
             <div className="absolute top-4 left-4 z-10 bg-zinc-950/80 px-2 py-1 rounded text-[10px] uppercase font-bold text-zinc-500 tracking-wider border border-zinc-800 backdrop-blur">
               Preview
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
               <div className="text-xs text-zinc-500 mb-4 font-mono">
                 {Math.round(previewSize.width)}px × {Math.round(previewSize.height)}px
               </div>

               {/* Resizable Container */}
               <div 
                 ref={previewContainerRef}
                 className="resize overflow-hidden border border-cyan-500/30 bg-zinc-900/50 shadow-2xl relative min-w-[50px] min-h-[50px]"
                 style={{ width: 300, height: 300 }} // Initial visual size
               >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,#1f1f22_25%,transparent_25%,transparent_75%,#1f1f22_75%,#1f1f22),linear-gradient(45deg,#1f1f22_25%,transparent_25%,transparent_75%,#1f1f22_75%,#1f1f22)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20 pointer-events-none"></div>
                  
                  {image && (
                    <PreviewCanvas 
                      width={previewSize.width}
                      height={previewSize.height}
                      image={image}
                      xAxes={xAxes}
                      yAxes={yAxes}
                      tiles={tiles}
                      rowScaling={rowScaling}
                      colScaling={colScaling}
                    />
                  )}

                  {/* Custom Resize Handle Icon overlay */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-500/20 pointer-events-none flex items-center justify-center">
                    <div className="w-2 h-2 border-r-2 border-b-2 border-cyan-500"></div>
                  </div>
               </div>
               
               <p className="mt-6 text-zinc-500 text-xs max-w-xs text-center">
                 Drag the bottom-right corner of the box above to test the Sliced Picture behavior.
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* --- Sidebar Inspector --- */}
      <Inspector 
        xAxes={xAxes}
        yAxes={yAxes}
        tiles={tiles}
        rowScaling={rowScaling}
        colScaling={colScaling}
        onUpdateX={setXAxes}
        onUpdateY={setYAxes}
        onUpdateTiles={setTiles}
        onToggleRowScaling={toggleRowScaling}
        onToggleColScaling={toggleColScaling}
        onDeleteAxis={handleDeleteAxis}
        onAddAxis={handleAddAxis}
        selectedAxisId={selectedAxis?.id || null}
        selectedAxisType={selectedAxis?.type || null}
        jsonOutput={generateJSON()}
        onLoadJson={handleLoadJson}
      />
    </div>
  );
}

export default App;