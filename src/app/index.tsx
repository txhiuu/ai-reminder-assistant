import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, ListRenderItem, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TheGhiChu from '../components/NoteCard';
import { CHU } from '../constants/vi';
import { layDanhSach, xoaGhiChu } from '../storage/noteStorage';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { GhiChu } from '../types';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export default function ManHinhTrangChu() {

  const [danhSachGhiChu, setDanhSachGhiChu] = useState<GhiChu[]>([]);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      taiDuLieu();
    }, [])
  );

  const taiDuLieu = async () => {
    const duLieu = await layDanhSach();

    // --- LOGIC SẮP XẾP MỚI ---
    // Ưu tiên 1: Có nhắc việc (xếp theo thời gian gần nhất)
    // Ưu tiên 2: Không có nhắc việc (xếp theo ngày tạo mới nhất)
    const duLieuDaSapXep = duLieu.sort((a, b) => {
      const aCoNhac = !!a.thoiGianNhac;
      const bCoNhac = !!b.thoiGianNhac;

      // Nếu a có nhắc, b không có -> a lên trước
      if (aCoNhac && !bCoNhac) return -1;
      // Nếu a không có, b có -> b lên trước
      if (!aCoNhac && bCoNhac) return 1;

      // Nếu cả 2 đều có nhắc -> so sánh thời gian nhắc
      if (aCoNhac && bCoNhac) {
        return new Date(a.thoiGianNhac!).getTime() - new Date(b.thoiGianNhac!).getTime();
      }

      // Nếu cả 2 đều không có nhắc -> so sánh ngày tạo (mới nhất lên đầu)
      return b.ngayTao - a.ngayTao;
    });

    setDanhSachGhiChu(duLieuDaSapXep);
  };

  const xacNhanXoa = (id: string) => {
    Alert.alert(CHU.chung.xacNhanXoa, CHU.chung.noiDungXoa, [
      { text: CHU.chung.huy, style: 'cancel' },
      {
        text: CHU.chung.co,
        style: 'destructive',
        onPress: async () => {
          const danhSachMoi = await xoaGhiChu(id);
          taiDuLieu();
        },
      },
    ]);
  };

  const renderThe: ListRenderItem<GhiChu> = ({ item }) => {
    
    let chuoiThoiGianHienThi: string = CHU.trangChu.khongNhac;

    if (item.thoiGianNhac) {
      const thoiGian = dayjs(item.thoiGianNhac);
      if (thoiGian.isSame(dayjs(), 'day')) {
        chuoiThoiGianHienThi = `Hôm nay, ${thoiGian.format('HH:mm')}`;
      } else {
        chuoiThoiGianHienThi = thoiGian.format('DD/MM/YYYY, HH:mm');
      }
    }

    return (
      <TheGhiChu
        ghiChu={item}
        chuoiThoiGianHienThi={chuoiThoiGianHienThi}
        khiBam={() => router.push(`/add-note?id=${item.id}`)}
        khiGiu={() => xacNhanXoa(item.id)}
      />
    );
  };

  return (
    <SafeAreaView style={kieu.khungChua}>
      <View style={kieu.thanhTieuDe}>
        <Text style={KIEU_CHU.tieuDeLon}>{CHU.trangChu.tieuDe}</Text>
        <TouchableOpacity
          onPress={() => router.push('/add-note')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={kieu.nutThem}>+</Text>
        </TouchableOpacity>
      </View>

      {danhSachGhiChu.length === 0 ? (
        <View style={kieu.trangThaiTrong}>
          <Text style={kieu.tieuDeTrong}>{CHU.trangChu.trong}</Text>
          <Text style={kieu.phuDeTrong}>{CHU.trangChu.phuDeTrong}</Text>
        </View>
      ) : (
        <FlatList
          data={danhSachGhiChu}
          keyExtractor={(item) => item.id}
          renderItem={renderThe}
          contentContainerStyle={kieu.noiDungDanhSach}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingTop: KHOANG_CACH.trung,
    paddingBottom: KHOANG_CACH.vua,
  },
  nutThem: {
    fontSize: 32,
    color: MAU_SAC.nhanManh,
    fontWeight: '300',
    lineHeight: 34,
  },
  noiDungDanhSach: {
    paddingHorizontal: KHOANG_CACH.lon,
    paddingBottom: KHOANG_CACH.ratLon,
  },
  trangThaiTrong: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  tieuDeTrong: {
    fontSize: 18,
    fontWeight: '500',
    color: MAU_SAC.chuPhu,
    marginBottom: KHOANG_CACH.vua,
    textAlign: 'center',
  },
  phuDeTrong: { ...KIEU_CHU.chuThich, textAlign: 'center' },
});