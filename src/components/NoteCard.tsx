import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { CHU } from '../constants/vi';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { GhiChu } from '../types';

interface Props {
  ghiChu: GhiChu;
  chuoiThoiGianHienThi: string;
  khiBam: () => void;
  khiGiu: () => void;
}

export default function TheGhiChu({ ghiChu, chuoiThoiGianHienThi, khiBam, khiGiu }: Props) {
  return (
    <TouchableOpacity
      style={kieu.the}
      activeOpacity={0.7}
      onPress={khiBam}
      onLongPress={khiGiu}
    >
      <Text style={KIEU_CHU.tieuDe} numberOfLines={1}>
        {ghiChu.tieuDe || CHU.trangChu.khongTieuDe}
      </Text>
      {ghiChu.noiDung ? (
        <Text style={kieu.noiDung} numberOfLines={2}>
          {ghiChu.noiDung}
        </Text>
      ) : null}
      <Text style={[
        kieu.thoiGian, 
        ghiChu.thoiGianNhac ? kieu.coNhac : null
      ]}>
        {chuoiThoiGianHienThi}
      </Text>
    </TouchableOpacity>
  );
}

const kieu = StyleSheet.create({
  the: {
    backgroundColor: MAU_SAC.beMat,
    paddingVertical: 14,
    paddingHorizontal: KHOANG_CACH.trung,
    borderRadius: 8,
    marginBottom: KHOANG_CACH.vua + 2,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
  },
  noiDung: {
    fontSize: 14,
    color: MAU_SAC.chuPhu,
    marginTop: KHOANG_CACH.nho,
    lineHeight: 20,
  },
  thoiGian: {
    ...KIEU_CHU.chuThich,
    marginTop: KHOANG_CACH.vua,
  },
  coNhac: {
    color: MAU_SAC.nhanManh,
    fontWeight: '500',
  }
});