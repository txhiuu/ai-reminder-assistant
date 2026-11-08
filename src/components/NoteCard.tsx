import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CHU } from '../constants/vi';
import { DO_BO_GOC, KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { GhiChu } from '../types';
import { IconDongHo, IconTick } from './Icons';

interface Props {
  ghiChu: GhiChu;
  chuoiThoiGianHienThi: string;
  trangThai?: 'quaHan' | 'homNay' | 'sapToi' | 'khongNhac';
  daHoanThanh?: boolean;
  khiBam: () => void;
  khiGiu: () => void;
  khiDoiTrangThai?: () => void;
}

export default function TheGhiChu({
  ghiChu,
  chuoiThoiGianHienThi,
  trangThai = 'khongNhac',
  daHoanThanh = false,
  khiBam,
  khiGiu,
  khiDoiTrangThai,
}: Props) {
  // Xác định màu sắc theo trạng thái thời gian
  let mauBadgeNen: string = MAU_SAC.vienNhe;
  let mauBadgeChu: string = MAU_SAC.chuPhu;

  if (trangThai === 'quaHan') {
    mauBadgeNen = MAU_SAC.nguyHiemNhat;
    mauBadgeChu = MAU_SAC.nguyHiem;
  } else if (trangThai === 'homNay') {
    mauBadgeNen = MAU_SAC.homNayNhat;
    mauBadgeChu = MAU_SAC.homNay;
  } else if (trangThai === 'sapToi') {
    mauBadgeNen = MAU_SAC.sapToiNhat;
    mauBadgeChu = MAU_SAC.sapToi;
  }

  return (
    <TouchableOpacity
      style={[
        kieu.the,
        daHoanThanh && kieu.theDaXong,
        trangThai === 'quaHan' && !daHoanThanh && kieu.theQuaHan,
      ]}
      activeOpacity={0.7}
      onPress={khiBam}
      onLongPress={khiGiu}
    >
      <View style={kieu.hangTren}>
        {/* Checkbox hoàn thành */}
        {khiDoiTrangThai ? (
          <TouchableOpacity
            style={[kieu.oTick, daHoanThanh && kieu.oTickDaXong]}
            onPress={khiDoiTrangThai}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {daHoanThanh && <IconTick size={14} color="#FFFFFF" />}
          </TouchableOpacity>
        ) : null}

        <View style={kieu.khoiVanBan}>
          <Text
            style={[
              KIEU_CHU.tieuDe,
              daHoanThanh && kieu.tieuDeGach,
            ]}
            numberOfLines={1}
          >
            {ghiChu.tieuDe || CHU.trangChu.khongTieuDe}
          </Text>

          {ghiChu.noiDung ? (
            <Text
              style={[
                kieu.noiDung,
                daHoanThanh && kieu.noiDungGach,
              ]}
              numberOfLines={2}
            >
              {ghiChu.noiDung}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Badge thời gian */}
      <View style={kieu.hangDuoi}>
        <View style={[kieu.badgeThoiGian, { backgroundColor: mauBadgeNen }]}>
          <IconDongHo size={13} color={mauBadgeChu} />
          <Text style={[kieu.chuThoiGian, { color: mauBadgeChu }]}>
            {chuoiThoiGianHienThi}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const kieu = StyleSheet.create({
  the: {
    backgroundColor: MAU_SAC.theNen,
    paddingVertical: KHOANG_CACH.trung,
    paddingHorizontal: KHOANG_CACH.trung,
    borderRadius: DO_BO_GOC.trung,
    marginBottom: KHOANG_CACH.vua + 3,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
    // Soft shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  theDaXong: {
    opacity: 0.55,
    backgroundColor: '#F8FAFC',
    borderColor: MAU_SAC.vienNhe,
  },
  theQuaHan: {
    borderColor: '#FCA5A5',
  },
  hangTren: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  oTick: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: MAU_SAC.chuMo,
    marginRight: KHOANG_CACH.vua + 4,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MAU_SAC.beMat,
  },
  oTickDaXong: {
    backgroundColor: MAU_SAC.hoanThanh,
    borderColor: MAU_SAC.hoanThanh,
  },
  khoiVanBan: {
    flex: 1,
  },
  tieuDeGach: {
    textDecorationLine: 'line-through',
    color: MAU_SAC.chuMo,
  },
  noiDung: {
    fontSize: 14,
    color: MAU_SAC.chuPhu,
    marginTop: KHOANG_CACH.nho,
    lineHeight: 20,
  },
  noiDungGach: {
    textDecorationLine: 'line-through',
    color: MAU_SAC.chuMo,
  },
  hangDuoi: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: KHOANG_CACH.vua + 2,
    paddingTop: KHOANG_CACH.vua,
    borderTopWidth: 1,
    borderTopColor: MAU_SAC.vienNhe,
  },
  badgeThoiGian: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DO_BO_GOC.nho,
  },
  chuThoiGian: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
});