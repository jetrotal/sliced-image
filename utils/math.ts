import { Axis, TileMode, TileMap } from '../types';

interface Segment {
  start: number; // Pixel start in source
  length: number; // Pixel length in source
  isFixed: boolean;
  index: number;
}

interface DestSegment {
  start: number;
  length: number;
  srcIndex: number;
}

/**
 * Helper to determine the effective mode of a tile.
 * Defaults to: Even indices = Fixed, Odd indices = Stretch
 */
export const getEffectiveTileMode = (tiles: TileMap, row: number, col: number): TileMode => {
  const key = `${row}-${col}`;
  if (tiles[key]) return tiles[key].mode;

  // Default Tile Mode behavior matches the "Expected" behavior of a standard N-Slice
  // However, since we now control Grid Scaling explicitly, the Tile Mode just defaults
  // to Stretch (filling the available space) unless manually set to Fixed.
  // In standard 9-slice, even fixed corners are technically "Stretched" to fill their fixed box.
  // But "Fixed" tile mode implies "Do not scale content".
  // Let's default to Stretch so it fills the cell defined by the grid.
  return TileMode.Stretch;
};

/**
 * Generates the default alternating scaling pattern (Fixed -> Scale -> Fixed -> Scale...)
 */
export const generateDefaultScaling = (numSegments: number): boolean[] => {
  return Array.from({ length: numSegments }).map((_, i) => i % 2 !== 0);
};

/**
 * Parses axes into segments using explicit scaling configuration
 */
export const calculateSegments = (
  axes: Axis[], 
  totalSize: number, 
  scalingArray: boolean[]
): Segment[] => {
  // Sort axes by value
  const sorted = [...axes].sort((a, b) => a.value - b.value);
  
  const segments: Segment[] = [];
  let cursor = 0;

  const boundaries = [...sorted.map(a => (a.value / 100) * totalSize), totalSize];

  boundaries.forEach((boundary, i) => {
    // Fallback to false (Fixed) if array is not long enough
    const isScalable = scalingArray[i] ?? false; 
    const length = boundary - cursor;
    
    if (length > 0) {
      segments.push({
        start: cursor,
        length: length,
        isFixed: !isScalable,
        index: i
      });
    }
    cursor = boundary;
  });

  return segments;
};

/**
 * Calculates destination layout based on source segments and target size
 */
export const calculateDestinationSegments = (
  srcSegments: Segment[],
  targetSize: number
): DestSegment[] => {
  // 1. Calculate total fixed size
  const totalFixed = srcSegments
    .filter(s => s.isFixed)
    .reduce((acc, s) => acc + s.length, 0);

  // 2. Calculate available space for scaling segments
  let availableScaleSpace = Math.max(0, targetSize - totalFixed);
  
  // If target is smaller than fixed, scale fixed down
  const scaleFixed = targetSize < totalFixed ? targetSize / totalFixed : 1;
  
  // 3. Calculate total weight of scaling segments
  const totalScaleSourceLength = srcSegments
    .filter(s => !s.isFixed)
    .reduce((acc, s) => acc + s.length, 0);

  const destSegments: DestSegment[] = [];
  let cursor = 0;
  
  srcSegments.forEach(seg => {
    let destLength = 0;

    if (seg.isFixed) {
      destLength = seg.length * scaleFixed;
    } else {
      if (totalScaleSourceLength === 0) {
        destLength = 0;
      } else {
        // Distribute available space based on original proportion
        const ratio = seg.length / totalScaleSourceLength;
        destLength = ratio * availableScaleSpace;
      }
    }

    destSegments.push({
      start: cursor,
      length: destLength,
      srcIndex: seg.index
    });

    cursor += destLength;
  });

  return destSegments;
};