import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconDong, IconDongHo, IconTick } from '../components/Icons';
import { CHU } from '../constants/vi';
import { layTheoId, luuGhiChu } from '../storage/noteStorage';
import { DO_BO_GOC, KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { GhiChu } from '../types';
import { taoId } from '../utils/generateId';

export default function ManHinhThemGhiChu() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dangSua = !!id;

  const [tieuDe, setTieuDe] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [ngayNhac, setNgayNhac] = useState<Date | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  const [cheDoPicker, setCheDoPicker] = useState<'date' | 'time' | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardOffset(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (dangSua && id) {
      taiDuLieuCu(id);
    }
  }, [id]);

  const taiDuLieuCu = async (ghiChuId: string) => {
    const duLieu = await layTheoId(ghiChuId);
    if (duLieu) {
      setTieuDe(duLieu.tieuDe);
      setNoiDung(duLieu.noiDung);
      if (duLieu.thoiGianNhac) {
        setNgayNhac(new Date(duLieu.thoiGianNhac));
      }
    }
  };

  const khiThayDoiThoiGian = (event: DateTimePickerChangeEvent, ngayDuocChon?: Date) => {
    if (Platform.OS === 'android') {
      setCheDoPicker(null);
    }
    if (ngayDuocChon) {
      if (Platform.OS === 'ios') {
        setNgayNhac(ngayDuocChon);
      } else {
        if (cheDoPicker === 'date') {
          const ngayDaChon = ngayDuocChon;
          setNgayNhac(ngayDaChon);
          setCheDoPicker('time');
        } else if (cheDoPicker === 'time') {
          const ngayHienTai = ngayNhac || new Date();
          const ngayGioCuoiCung = new Date(
            ngayHienTai.getFullYear(),
            ngayHienTai.getMonth(),
            ngayHienTai.getDate(),
            ngayDuocChon.getHours(),
            ngayDuocChon.getMinutes()
          );
          setNgayNhac(ngayGioCuoiCung);
        }
      }
    }
  };

  const moPicker = () => {
    if (Platform.OS === 'ios') {
      setCheDoPicker('datetime' as any);
    } else {
      setCheDoPicker('date');
    }
  };

  const xoaThoiGian = () => {
    setNgayNhac(null);
  };

  // Các nút chọn nhanh thời gian tiện lợi
  const datNhanhThoiGian = (loai: 'motGio' | 'toiNay' | 'sangMai' | 'chieuMai') => {
    const bayGio = dayjs();
    let thoiGianMoi = bayGio;

    if (loai === 'motGio') {
      thoiGianMoi = bayGio.add(1, 'hour').minute(0).second(0);
    } else if (loai === 'toiNay') {
      thoiGianMoi = bayGio.hour(20).minute(0).second(0);
    } else if (loai === 'sangMai') {
      thoiGianMoi = bayGio.add(1, 'day').hour(8).minute(0).second(0);
    } else if (loai === 'chieuMai') {
      thoiGianMoi = bayGio.add(1, 'day').hour(15).minute(0).second(0);
    }

    setNgayNhac(thoiGianMoi.toDate());
  };

  const khiBamLuu = async () => {
    if (tieuDe.trim() === '') {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề ghi chú.');
      return;
    }

    if (dangLuu) return;
    setDangLuu(true);

    try {
      const thoiGianHienTai = Date.now();
      const ghiChuMoi: GhiChu = {
        id: id ?? taoId(),
        tieuDe: tieuDe.trim(),
        noiDung: noiDung.trim(),
        thoiGianNhac: ngayNhac ? ngayNhac.toISOString() : undefined,
        ngayTao: thoiGianHienTai,
        ngayCapNhat: thoiGianHienTai,
      };

      await luuGhiChu(ghiChuMoi);
      router.back();
    } catch (loi) {
      console.log('[AddNote] Lỗi lưu:', loi);
      Alert.alert('Lỗi', 'Không thể lưu ghi chú. Vui lòng thử lại.');
      setDangLuu(false);
    }
  };

  return (
    <SafeAreaView style={kieu.khungChua}>
      <KeyboardAvoidingView
        style={[
          { flex: 1 },
          Platform.OS === 'android' && keyboardOffset > 0 && { paddingBottom: keyboardOffset },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Modal */}
        <View style={kieu.thanhTieuDe}>
          <TouchableOpacity onPress={() => router.back()} style={kieu.nutHuy}>
            <IconDong size={20} color={MAU_SAC.chuPhu} />
            <Text style={kieu.chuNutHuy}>{CHU.themGhiChu.nutHuy}</Text>
          </TouchableOpacity>

          <Text style={KIEU_CHU.tieuDe}>
            {dangSua ? CHU.themGhiChu.tieuDeSua : CHU.themGhiChu.tieuDeMoi}
          </Text>

          <TouchableOpacity
            style={[kieu.nutLuu, dangLuu && kieu.nutLuuVoHieu]}
            onPress={khiBamLuu}
            disabled={dangLuu}
          >
            <IconTick size={16} color="#FFFFFF" />
            <Text style={kieu.chuNutLuu}>{CHU.themGhiChu.nutLuu}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={kieu.than}
          contentContainerStyle={[
            kieu.noiDungThan,
            Platform.OS === 'android' && keyboardOffset > 0 && { paddingBottom: keyboardOffset + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ô nhập tiêu đề */}
          <TextInput
            style={kieu.oTieuDe}
            placeholder={CHU.themGhiChu.goiYTieuDe}
            placeholderTextColor={MAU_SAC.chuMo}
            value={tieuDe}
            onChangeText={setTieuDe}
            autoFocus={!dangSua}
          />

          {/* Ô nhập nội dung */}
          <TextInput
            style={kieu.oNoiDung}
            placeholder={CHU.themGhiChu.goiYNoiDung}
            placeholderTextColor={MAU_SAC.chuMo}
            value={noiDung}
            onChangeText={setNoiDung}
            multiline
            textAlignVertical="top"
          />

          {/* Khu vực Hẹn giờ nhắc việc */}
          <View style={kieu.khungThoiGian}>
            <View style={kieu.hangNhanThoiGian}>
              <IconDongHo size={18} color={MAU_SAC.nhanManh} />
              <Text style={kieu.nhanThoiGian}>Thời gian nhắc việc</Text>
            </View>

            {/* Chip chọn nhanh */}
            <View style={kieu.hangChipNhanh}>
              <TouchableOpacity
                style={kieu.chipNhanh}
                onPress={() => datNhanhThoiGian('motGio')}
              >
                <Text style={kieu.chuChipNhanh}>+1 Giờ nữa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={kieu.chipNhanh}
                onPress={() => datNhanhThoiGian('toiNay')}
              >
                <Text style={kieu.chuChipNhanh}>Tối nay (20:00)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={kieu.chipNhanh}
                onPress={() => datNhanhThoiGian('sangMai')}
              >
                <Text style={kieu.chuChipNhanh}>Sáng mai (08:00)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={kieu.chipNhanh}
                onPress={() => datNhanhThoiGian('chieuMai')}
              >
                <Text style={kieu.chuChipNhanh}>Chiều mai (15:00)</Text>
              </TouchableOpacity>
            </View>

            {/* Ô hiển thị & mở bộ chọn tùy chỉnh */}
            <View style={kieu.hangThoiGian}>
              <TouchableOpacity
                style={[kieu.nutChonNgay, ngayNhac ? kieu.nutChonNgayDaChon : null]}
                onPress={moPicker}
              >
                <Text
                  style={[
                    kieu.chuNutChonNgay,
                    ngayNhac ? kieu.chuDaChonNgay : null,
                  ]}
                >
                  {ngayNhac
                    ? `⏰ ${dayjs(ngayNhac).format('HH:mm - DD/MM/YYYY')}`
                    : '📅 Chọn ngày & giờ cụ thể...'}
                </Text>
              </TouchableOpacity>

              {ngayNhac && (
                <TouchableOpacity style={kieu.nutXoaNgay} onPress={xoaThoiGian}>
                  <Text style={kieu.chuNutXoaNgay}>Xóa</Text>
                </TouchableOpacity>
              )}
            </View>

            {cheDoPicker && (
              <DateTimePicker
                value={ngayNhac || new Date()}
                mode={Platform.OS === 'ios' ? 'datetime' : cheDoPicker}
                display="default"
                onValueChange={khiThayDoiThoiGian}
                minimumDate={new Date()}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const kieu = StyleSheet.create({
  khungChua: {
    flex: 1,
    backgroundColor: MAU_SAC.nen,
  },
  thanhTieuDe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: KHOANG_CACH.lon,
    paddingVertical: KHOANG_CACH.trung,
    backgroundColor: MAU_SAC.beMat,
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vien,
  },
  nutHuy: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  chuNutHuy: {
    fontSize: 15,
    color: MAU_SAC.chuPhu,
    marginLeft: 4,
  },
  nutLuu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MAU_SAC.nhanManh,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DO_BO_GOC.tron,
  },
  nutLuuVoHieu: {
    opacity: 0.4,
  },
  chuNutLuu: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  than: {
    flex: 1,
  },
  noiDungThan: {
    padding: KHOANG_CACH.lon,
  },
  oTieuDe: {
    fontSize: 20,
    fontWeight: '700',
    color: MAU_SAC.chuChinh,
    backgroundColor: MAU_SAC.beMat,
    paddingHorizontal: KHOANG_CACH.trung,
    paddingVertical: 14,
    borderRadius: DO_BO_GOC.vua,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
  },
  oNoiDung: {
    fontSize: 15,
    color: MAU_SAC.chuChinh,
    lineHeight: 22,
    backgroundColor: MAU_SAC.beMat,
    paddingHorizontal: KHOANG_CACH.trung,
    paddingVertical: 14,
    borderRadius: DO_BO_GOC.vua,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
    marginTop: KHOANG_CACH.trung,
    minHeight: 140,
  },
  khungThoiGian: {
    marginTop: KHOANG_CACH.lon,
    backgroundColor: MAU_SAC.beMat,
    padding: KHOANG_CACH.trung,
    borderRadius: DO_BO_GOC.trung,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
  },
  hangNhanThoiGian: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: KHOANG_CACH.vua + 2,
  },
  nhanThoiGian: {
    fontSize: 14,
    fontWeight: '700',
    color: MAU_SAC.chuChinh,
    marginLeft: 6,
  },
  hangChipNhanh: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: KHOANG_CACH.trung,
  },
  chipNhanh: {
    backgroundColor: MAU_SAC.nhanManhNhat,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DO_BO_GOC.tron,
  },
  chuChipNhanh: {
    fontSize: 12,
    fontWeight: '600',
    color: MAU_SAC.nhanManh,
  },
  hangThoiGian: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutChonNgay: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: KHOANG_CACH.trung,
    backgroundColor: MAU_SAC.nen,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
    borderRadius: DO_BO_GOC.vua,
  },
  nutChonNgayDaChon: {
    backgroundColor: MAU_SAC.nhanManhNhat,
    borderColor: '#C7D2FE',
  },
  chuNutChonNgay: {
    fontSize: 14,
    color: MAU_SAC.chuPhu,
  },
  chuDaChonNgay: {
    color: MAU_SAC.nhanManh,
    fontWeight: '600',
  },
  nutXoaNgay: {
    marginLeft: KHOANG_CACH.vua,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: MAU_SAC.nguyHiemNhat,
    borderRadius: DO_BO_GOC.vua,
  },
  chuNutXoaNgay: {
    color: MAU_SAC.nguyHiem,
    fontSize: 13,
    fontWeight: '600',
  },
});