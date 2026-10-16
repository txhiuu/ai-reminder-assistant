import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [thoiGianNhac, setThoiGianNhac] = useState('');
  const [dangLuu, setDangLuu] = useState(false);

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
      setThoiGianNhac(duLieu.thoiGianNhac ?? '');
    }
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
        thoiGianNhac: thoiGianNhac.trim() || undefined,
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
        {/*HEADER*/}
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

        {/*FORM NHẬP LIỆU*/}
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
            returnKeyType="next"
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
            <Text style={kieu.nhanThoiGian}>Nhắc việc</Text>
            <TextInput
              style={kieu.oThoiGian}
              placeholder={CHU.themGhiChu.goiYThoiGian}
              placeholderTextColor={MAU_SAC.chuPhu}
              value={thoiGianNhac}
              onChangeText={setThoiGianNhac}
            />
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
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vien,
  },
  nutHuy: {
    fontSize: 16,
    color: MAU_SAC.nhanManh,
  },
  nutLuu: {
    fontSize: 16,
    color: MAU_SAC.nhanManh,
    fontWeight: '600',
  },
  nutLuuVoHieu: {
    opacity: 0.4,
  },
  than: {
    flex: 1,
  },
  noiDungThan: {
    padding: KHOANG_CACH.lon,
  },
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
  oThoiGian: {
    fontSize: 16,
    color: MAU_SAC.chuChinh,
    paddingVertical: KHOANG_CACH.vua,
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vien,
  },
});