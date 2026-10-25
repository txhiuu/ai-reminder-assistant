export interface GhiChu {
  id : string;
  tieuDe: string;
  noiDung: string;
  thoiGianNhac?: string;
  ngayTao: number;
  ngayCapNhat: number;
}

export interface TinNhan {
  id: string;
  vaiTro: 'nguoiDung' | 'heThong';
  noiDung: string;
  thoiGian: number; 
}