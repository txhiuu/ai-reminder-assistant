import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHU } from '../constants/vi';
import { layTheoId, luuGhiChu } from '../storage/noteStorage';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
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
      } 
      else {
        if (cheDoPicker === 'date') {
          const ngayDaChon = ngayDuocChon;
          setNgayNhac(ngayDaChon);
          setCheDoPicker('time');
        } 
        else if (cheDoPicker === 'time') {
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
    }
    else {
      setCheDoPicker('date');
    }
  };

  const xoaThoiGian = () => {
    setNgayNhac(null);
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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={kieu.thanhTieuDe}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={kieu.nutHuy}>{CHU.themGhiChu.nutHuy}</Text>
          </TouchableOpacity>
          <Text style={KIEU_CHU.tieuDe}>
            {dangSua ? CHU.themGhiChu.tieuDeSua : CHU.themGhiChu.tieuDeMoi}
          </Text>
          <TouchableOpacity onPress={khiBamLuu} disabled={dangLuu}>
            <Text style={[kieu.nutLuu, dangLuu && kieu.nutLuuVoHieu]}>
              {CHU.themGhiChu.nutLuu}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={kieu.than}
          contentContainerStyle={kieu.noiDungThan}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={kieu.oTieuDe}
            placeholder={CHU.themGhiChu.goiYTieuDe}
            placeholderTextColor={MAU_SAC.chuPhu}
            value={tieuDe}
            onChangeText={setTieuDe}
            autoFocus={!dangSua}
          />
          <TextInput
            style={kieu.oNoiDung}
            placeholder={CHU.themGhiChu.goiYNoiDung}
            placeholderTextColor={MAU_SAC.chuPhu}
            value={noiDung}
            onChangeText={setNoiDung}
            multiline
            textAlignVertical="top"
          />

          <View style={kieu.khungThoiGian}>
            <Text style={kieu.nhanThoiGian}>Thời gian nhắc việc</Text>
            <View style={kieu.hangThoiGian}>
              <TouchableOpacity
                style={kieu.nutChonNgay}
                onPress={moPicker}
              >
                <Text style={kieu.chuNutChonNgay}>
                  {ngayNhac
                    ? dayjs(ngayNhac).format('HH:mm - DD/MM/YYYY')
                    : 'Chưa chọn thời gian'}
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
  khungChua: { flex: 1, backgroundColor: MAU_SAC.nen },
  thanhTieuDe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: KHOANG_CACH.lon,
    paddingVertical: KHOANG_CACH.trung,
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vien,
  },
  nutHuy: { fontSize: 16, color: MAU_SAC.nhanManh },
  nutLuu: { fontSize: 16, color: MAU_SAC.nhanManh, fontWeight: '600' },
  nutLuuVoHieu: { opacity: 0.4 },
  than: { flex: 1 },
  noiDungThan: { padding: KHOANG_CACH.lon },
  oTieuDe: {
    fontSize: 20,
    fontWeight: '600',
    color: MAU_SAC.chuChinh,
    paddingVertical: KHOANG_CACH.vua,
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vien,
  },
  oNoiDung: {
    fontSize: 16,
    color: MAU_SAC.chuChinh,
    lineHeight: 24,
    paddingVertical: KHOANG_CACH.trung,
    minHeight: 150,
  },
  khungThoiGian: {
    marginTop: KHOANG_CACH.trung,
    paddingTop: KHOANG_CACH.trung,
    borderTopWidth: 1,
    borderTopColor: MAU_SAC.vien,
  },
  nhanThoiGian: {
    ...KIEU_CHU.chuThich,
    marginBottom: KHOANG_CACH.vua,
    fontWeight: '600',
  },
  hangThoiGian: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutChonNgay: {
    flex: 1,
    paddingVertical: KHOANG_CACH.trung,
    paddingHorizontal: KHOANG_CACH.trung,
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
    borderRadius: 8,
  },
  chuNutChonNgay: { fontSize: 16, color: MAU_SAC.chuChinh },
  nutXoaNgay: { marginLeft: KHOANG_CACH.vua, padding: KHOANG_CACH.vua },
  chuNutXoaNgay: { color: MAU_SAC.nguyHiem, fontSize: 14, fontWeight: '500' },
});