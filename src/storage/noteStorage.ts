import AsyncStorage from '@react-native-async-storage/async-storage';
import { GhiChu } from '../types';

const KHOA_LUU_TRU = '@AiReminderApp:notes';

//Lấy danh sách ghi chú
export const layDanhSach = async (): Promise<GhiChu[]> => {
  try {
    const chuoiJson = await AsyncStorage.getItem(KHOA_LUU_TRU);
    if (chuoiJson !== null) {
      return JSON.parse(chuoiJson) as GhiChu[];
    }
    return [];
  } catch (loi) {
    console.log('[Storage] Lỗi đọc dữ liệu:', loi);
    return [];
  }
};

//Lấy 1 ghi chú theo id
export const layTheoId = async (id: string): Promise<GhiChu | null> => {
  const danhSach = await layDanhSach();
  const timThay = danhSach.find((gh) => gh.id === id);
  return timThay ?? null;
};

//Lưu ghi chú (thêm mới hoặc cập nhật)
export const luuGhiChu = async (ghiChu: GhiChu): Promise<GhiChu[]> => {
  try {
    const danhSachHienTai = await layDanhSach();
    const viTriCu = danhSachHienTai.findIndex((gh) => gh.id === ghiChu.id);

    let danhSachMoi: GhiChu[];

    if (viTriCu >= 0) {
      // Đã có -> cập nhật
      danhSachMoi = [...danhSachHienTai];
      danhSachMoi[viTriCu] = { ...ghiChu, ngayCapNhat: Date.now() };
    } else {
      // Chưa có -> thêm mới lên đầu
      danhSachMoi = [ghiChu, ...danhSachHienTai];
    }

    await AsyncStorage.setItem(KHOA_LUU_TRU, JSON.stringify(danhSachMoi));
    return danhSachMoi;
  } catch (loi) {
    console.log('[Storage] Lỗi lưu dữ liệu:', loi);
    return [];
  }
};

//Xóa ghi chú theo id
export const xoaGhiChu = async (id: string): Promise<GhiChu[]> => {
  try {
    const danhSachHienTai = await layDanhSach();
    const danhSachMoi = danhSachHienTai.filter((gh) => gh.id !== id);
    await AsyncStorage.setItem(KHOA_LUU_TRU, JSON.stringify(danhSachMoi));
    return danhSachMoi;
  } catch (loi) {
    console.log('[Storage] Lỗi xóa dữ liệu:', loi);
    return [];
  }
};