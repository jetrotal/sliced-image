export enum TileMode {
  Fixed = 'Fixed',
  Stretch = 'Stretch',
  Repeat = 'Repeat',
  Hidden = 'Hidden',
}

export interface Axis {
  id: string;
  value: number; // Percentage 0-100 relative to image size
}

export interface TileConfig {
  mode: TileMode;
}

// Map key format: "rowIndex-colIndex" -> TileConfig
export type TileMap = Record<string, TileConfig>;

export interface NSliceConfig {
  filename?: string; // Original filename of the source image
  xAxes: Axis[];
  yAxes: Axis[];
  tiles: TileMap;
  rowScaling: boolean[]; // true = Scale, false = Fixed
  colScaling: boolean[]; // true = Scale, false = Fixed
}