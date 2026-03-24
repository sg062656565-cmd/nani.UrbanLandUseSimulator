export interface Bonus {
  id: string;
  label: string;
  val: number;
}

export interface BuildingStats {
  valid: boolean;
  widthM: number;
  depthM: number;
  widthCells: number;
  depthCells: number;
  wholeFloors: number;
  remainder: number;
  footprintArea: number;
  totalFloorArea: number;
  displayFloors: number;
}

export interface PlotData {
  bcr: number; // Building Coverage Ratio (0-100)
  far: number; // Floor Area Ratio
  bonuses: string[]; // List of active bonus IDs
}

export type PlotKey = 'a' | 'b';

export interface SceneRef {
  resetCamera: () => void;
}