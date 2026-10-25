import AsyncStorage from '@react-native-async-storage/async-storage';
import { TinNhan } from '../types';

const CHAT_STORAGE_KEY = '@AiReminderApp:chatHistory';

// Thời gian reset: 30 phút (30 * 60 * 1000 ms). 
//24h: (24 * 60 * 60 * 1000)
const THOI_GIAN_RESET = 30 * 60 * 1000; 

export const layLichSuChat = async (): Promise<TinNhan[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    if (jsonValue != null) {
      const danhSach: TinNhan[] = JSON.parse(jsonValue);
      
      if (danhSach.length > 0) {
        const tinNhanCuoi = danhSach[danhSach.length - 1];
        const thoiGianHienTai = Date.now();
        
        if (thoiGianHienTai - tinNhanCuoi.thoiGian > THOI_GIAN_RESET) {
          console.log('🧹 Lịch sử chat quá 30 phút, tự động reset.');
          await xoaLichSuChat();
          return [];
        }
      }
      return danhSach;
    }
    return [];
  } catch (e) {
    console.error('Lỗi đọc lịch sử chat:', e);
    return [];
  }
};

export const luuLichSuChat = async (danhSach: TinNhan[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(danhSach));
  } catch (e) {
    console.error('Lỗi lưu lịch sử chat:', e);
  }
};

export const xoaLichSuChat = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (e) {
    console.error('Lỗi xóa lịch sử chat:', e);
  }
};