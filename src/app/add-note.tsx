import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHU } from '../constants/vi';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';

export default function ManHinhThemGhiChu() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dangSua = !!id;

  return (
    <SafeAreaView style={kieu.khungChua}>
      {/* Header */}
      <View style={kieu.thanhTieuDe}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={kieu.nutHuy}>{CHU.themGhiChu.nutHuy}</Text>
        </TouchableOpacity>
        <Text style={KIEU_CHU.tieuDe}>
          {dangSua ? CHU.themGhiChu.tieuDeSua : CHU.themGhiChu.tieuDeMoi}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Body */}
      <View style={kieu.than}>
        <Text style={KIEU_CHU.chuThich}>
          Loading!!!
        </Text>
        {dangSua && (
          <Text style={[KIEU_CHU.chuThich, { marginTop: 8 }]}>
            Đang sửa ghi chú có ID: {id}
          </Text>
        )}
      </View>
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
  than: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});