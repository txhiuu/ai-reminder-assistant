import { TextStyle } from "react-native";

export const MAU_SAC = {
  // Nền & bề mặt
  nen: '#F8FAFC',         
  beMat: '#FFFFFF',      
  theNen: '#FFFFFF',    
  
  // Màu chữ
  chuChinh: '#0F172A',    
  chuPhu: '#64748B',      
  chuMo: '#94A3B8',    
  
  // Viền & ngăn cách
  vien: '#E2E8F0',      
  vienNhe: '#F1F5F9',   
  
  // Màu thương hiệu AI & Nhấn mạnh
  nhanManh: '#6366F1',     
  nhanManhToi: '#4F46E5', 
  nhanManhNhat: '#EEF2FF',
  aiGradient: ['#6366F1', '#8B5CF6', '#06B6D4'] as const,
  aiGradientSoft: ['#EEF2FF', '#F5F3FF', '#ECFEFF'] as const,
  
  // Màu trạng thái Smart Timeline
  nguyHiem: '#EF4444',      
  nguyHiemNhat: '#FEF2F2', 
  homNay: '#2563EB',      
  homNayNhat: '#EFF6FF',  
  sapToi: '#7C3AED',      
  sapToiNhat: '#F5F3FF',    
  hoanThanh: '#10B981',  
  hoanThanhNhat: '#ECFDF5',
  canhBao: '#F59E0B',      
  canhBaoNhat: '#FFFBEB',   
} as const;

export const KHOANG_CACH = {
  ratNho: 2,
  nho: 4,
  vua: 8,
  trung: 16,
  lon: 24,
  ratLon: 32,
} as const;

export const DO_BO_GOC = {
  nho: 6,
  vua: 10,
  trung: 14,
  lon: 18,
  tron: 9999,
} as const;

export const KIEU_CHU: Record<string, TextStyle> = {
  tieuDeLon: {
    fontSize: 28,
    fontWeight: '700',
    color: MAU_SAC.chuChinh,
    letterSpacing: -0.6,
  },

  tieuDe: {
    fontSize: 18,
    fontWeight: '600',
    color: MAU_SAC.chuChinh,
    letterSpacing: -0.2,
  },

  phuDe: {
    fontSize: 15,
    fontWeight: '500',
    color: MAU_SAC.chuPhu,
  },

  noiDung: {
    fontSize: 15,
    color: MAU_SAC.chuChinh,
    lineHeight: 22,
  },

  chuThich: {
    fontSize: 13,
    color: MAU_SAC.chuPhu,
  },

  chuNho: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  }
};