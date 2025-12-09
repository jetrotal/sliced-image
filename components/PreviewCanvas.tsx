import React, { useRef, useEffect } from 'react';
import { Axis, TileMap, TileMode } from '../types';
import { calculateSegments, calculateDestinationSegments, getEffectiveTileMode } from '../utils/math';

interface PreviewCanvasProps {
  width: number;
  height: number;
  image: HTMLImageElement | null;
  xAxes: Axis[];
  yAxes: Axis[];
  tiles: TileMap;
  rowScaling: boolean[];
  colScaling: boolean[];
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  width,
  height,
  image,
  xAxes,
  yAxes,
  tiles,
  rowScaling,
  colScaling
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Enable nearest neighbor for crisp pixel art
    ctx.imageSmoothingEnabled = true; 
    ctx.imageSmoothingQuality = 'high';

    // 1. Calculate Grid Scaling Behavior using explicit props
    // We pass the explicit boolean arrays to calculateSegments
    
    // 2. Calculate Segments
    const xSrcSegments = calculateSegments(xAxes, image.width, colScaling);
    const ySrcSegments = calculateSegments(yAxes, image.height, rowScaling);

    const xDstSegments = calculateDestinationSegments(xSrcSegments, width);
    const yDstSegments = calculateDestinationSegments(ySrcSegments, height);

    // 3. Iterate and Draw
    yDstSegments.forEach((yDst, rowIdx) => {
      xDstSegments.forEach((xDst, colIdx) => {
        const ySrc = ySrcSegments[rowIdx];
        const xSrc = xSrcSegments[colIdx];

        // Determine Tile Mode
        const mode = getEffectiveTileMode(tiles, rowIdx, colIdx);

        if (mode === TileMode.Hidden) return;

        // Source Rectangle
        const sx = xSrc.start;
        const sy = ySrc.start;
        const sw = xSrc.length;
        const sh = ySrc.length;

        // Destination Rectangle
        const dx = xDst.start;
        const dy = yDst.start;
        const dw = xDst.length;
        const dh = yDst.length;

        // Skip invalid draws
        if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

        if (mode === TileMode.Repeat) {
          ctx.save();
          // Clip to the destination area
          ctx.beginPath();
          ctx.rect(dx, dy, dw, dh);
          ctx.clip();
          
          const xRepeats = Math.ceil(dw / sw);
          const yRepeats = Math.ceil(dh / sh);

          for (let y = 0; y < yRepeats; y++) {
            for (let x = 0; x < xRepeats; x++) {
              ctx.drawImage(
                image,
                sx, sy, sw, sh,
                dx + (x * sw), dy + (y * sh), sw, sh
              );
            }
          }
          ctx.restore();
        } else if (mode === TileMode.Fixed) {
          // Fixed Mode: Draw source at original size, centered in destination
          ctx.save();
          ctx.beginPath();
          ctx.rect(dx, dy, dw, dh);
          ctx.clip();

          const centeredX = dx + (dw - sw) / 2;
          const centeredY = dy + (dh - sh) / 2;

          ctx.drawImage(
            image,
            sx, sy, sw, sh,
            centeredX, centeredY, sw, sh
          );
          ctx.restore();
        } else {
          // Stretch (Default)
          ctx.drawImage(
            image,
            sx, sy, sw, sh,
            dx, dy, dw, dh
          );
        }
      });
    });

  }, [width, height, image, xAxes, yAxes, tiles, rowScaling, colScaling]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="block bg-transparent"
    />
  );
};