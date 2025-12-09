import React, { useRef, useState, useEffect } from 'react';
import { Axis } from '../types';

interface GridLinesProps {
  width: number;
  height: number;
  xAxes: Axis[];
  yAxes: Axis[];
  onUpdateX: (axes: Axis[]) => void;
  onUpdateY: (axes: Axis[]) => void;
  selectedAxisId: string | null;
  onSelectAxis: (id: string | null, type: 'x' | 'y' | null) => void;
}

const HIT_AREA = 10;

export const GridLines: React.FC<GridLinesProps> = ({
  width,
  height,
  xAxes,
  yAxes,
  onUpdateX,
  onUpdateY,
  selectedAxisId,
  onSelectAxis,
}) => {
  const [dragging, setDragging] = useState<{ id: string, type: 'x' | 'y' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'x' | 'y') => {
    e.stopPropagation();
    setDragging({ id, type });
    onSelectAxis(id, type);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newValue = 0;

      if (dragging.type === 'x') {
        const relativeX = e.clientX - rect.left;
        newValue = Math.max(0, Math.min(100, (relativeX / width) * 100));
        
        onUpdateX(xAxes.map(axis => axis.id === dragging.id ? { ...axis, value: newValue } : axis));
      } else {
        const relativeY = e.clientY - rect.top;
        newValue = Math.max(0, Math.min(100, (relativeY / height) * 100));

        onUpdateY(yAxes.map(axis => axis.id === dragging.id ? { ...axis, value: newValue } : axis));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, width, height, xAxes, yAxes, onUpdateX, onUpdateY]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 pointer-events-none select-none z-10"
    >
      {/* Render X Axes (Vertical Lines) */}
      {xAxes.map((axis) => {
        const left = (axis.value / 100) * width;
        const isSelected = selectedAxisId === axis.id;
        
        return (
          <div
            key={axis.id}
            className={`absolute top-0 bottom-0 flex flex-col items-center group pointer-events-auto cursor-col-resize`}
            style={{ left: left, width: HIT_AREA, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleMouseDown(e, axis.id, 'x')}
          >
            <div className={`w-[2px] h-full transition-colors ${isSelected ? 'bg-cyan-400' : 'bg-cyan-500/50 group-hover:bg-cyan-400'}`}></div>
            {/* Top Handle */}
            <div className="absolute top-0 -mt-3">
               <svg width="12" height="12" viewBox="0 0 12 12" className={`${isSelected ? 'fill-cyan-400' : 'fill-cyan-500'}`}>
                 <path d="M0 0 L12 0 L6 8 Z" />
               </svg>
            </div>
            {/* Bottom Handle */}
            <div className="absolute bottom-0 -mb-3">
               <svg width="12" height="12" viewBox="0 0 12 12" className={`${isSelected ? 'fill-cyan-400' : 'fill-cyan-500'}`}>
                 <path d="M0 12 L12 12 L6 4 Z" />
               </svg>
            </div>
          </div>
        );
      })}

      {/* Render Y Axes (Horizontal Lines) */}
      {yAxes.map((axis) => {
        const top = (axis.value / 100) * height;
        const isSelected = selectedAxisId === axis.id;

        return (
          <div
            key={axis.id}
            className={`absolute left-0 right-0 flex flex-row items-center group pointer-events-auto cursor-row-resize`}
            style={{ top: top, height: HIT_AREA, transform: 'translateY(-50%)' }}
            onMouseDown={(e) => handleMouseDown(e, axis.id, 'y')}
          >
             <div className={`h-[2px] w-full transition-colors ${isSelected ? 'bg-cyan-400' : 'bg-cyan-500/50 group-hover:bg-cyan-400'}`}></div>
             {/* Left Handle */}
             <div className="absolute left-0 -ml-3">
               <svg width="12" height="12" viewBox="0 0 12 12" className={`${isSelected ? 'fill-cyan-400' : 'fill-cyan-500'}`}>
                 <path d="M0 0 L0 12 L8 6 Z" />
               </svg>
             </div>
             {/* Right Handle */}
             <div className="absolute right-0 -mr-3">
               <svg width="12" height="12" viewBox="0 0 12 12" className={`${isSelected ? 'fill-cyan-400' : 'fill-cyan-500'}`}>
                 <path d="M12 0 L12 12 L4 6 Z" />
               </svg>
             </div>
          </div>
        );
      })}
    </div>
  );
};