import { Bonus } from "./types";

export const CONFIG = {
  landSize: 100, // 100m x 100m
  gridDivisions: 10, // 10x10 grid -> 10m cells
  floorHeight: 3.5, // 3.5m per floor
  animMaxTime: 2000 
};

export const BONUSES_DATA: Bonus[] = [
  { id: 'open_space', label: '開放空間獎勵 (+15%)', val: 15 },
  { id: 'green_bldg', label: '綠建築標章 (+10%)', val: 10 },
  { id: 'smart_bldg', label: '智慧建築 (+6%)', val: 6 },
  { id: 'quake_proof', label: '耐震設計標章 (+5%)', val: 5 },
  { id: 'renewal', label: '都更/危老獎勵 (+30%)', val: 30 },
  { id: 'transfer', label: '容積移轉 (+40%)', val: 40 }
];

export const COLORS = {
  a: {
    base: 0x3b82f6,
    mesh: 0x60a5fa,
    wire: 0x1e3a8a,
    label: '#1e40af'
  },
  b: {
    base: 0xef4444,
    mesh: 0xf87171,
    wire: 0x7f1d1d,
    label: '#991b1b'
  }
};