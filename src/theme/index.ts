import { TextStyle } from "react-native";

export const MAU_SAC = {
  nen: '#F9F9F9',
  beMat: '#FFFFFF',
  chuChinh: '#1A1A1A',      
  chuPhu: '#8A8A8E',        
  vien: '#E5E5EA',     
  nhanManh: '#007AFF',    
  nguyHiem: '#FF3B30',      
} as const;


export const KHOANG_CACH = {
  nho: 4,
  vua: 8,
  trung: 16,
  lon: 24,
  ratLon: 32,
} as const;

export const KIEU_CHU: Record<string, TextStyle> = {
  tieuDeLon: {
    fontSize: 32,
    fontWeight: '700',
    color: MAU_SAC.chuChinh,
    letterSpacing: -0.5,
  },

  tieuDe: {
    fontSize: 18,
    fontWeight: '600',
    color: MAU_SAC.chuChinh,
    letterSpacing: -0.2,
  },

  noiDung: {
    fontSize: 16,
    color: MAU_SAC.chuChinh,
    lineHeight: 24,
  },

  chuThich: {
    fontSize: 13,
    color: MAU_SAC.chuPhu,
  }

}