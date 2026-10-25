import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ListRenderItem, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  
  // Lấy tham số search từ URL (nếu được điều hướng từ Chat)
  const { search } = useLocalSearchParams<{ search?: string }>();
  const [tuKhoaTimKiem, setTuKhoaTimKiem] = useState(search || '');

  // Đồng bộ state khi URL thay đổi
  useEffect(() => {
    setTuKhoaTimKiem(search || '');
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      taiDuLieu();
    }, [])
  );

  const taiDuLieu = async () => {
    const duLieu = await layDanhSach();

    // --- LOGIC SẮP XẾP ---
    const duLieuDaSapXep = duLieu.sort((a, b) => {
      const aCoNhac = !!a.thoiGianNhac;
      const bCoNhac = !!b.thoiGianNhac;

      if (aCoNhac && !bCoNhac) return -1;
      if (!aCoNhac && bCoNhac) return 1;

      if (aCoNhac && bCoNhac) {
        return new Date(a.thoiGianNhac!).getTime() - new Date(b.thoiGianNhac!).getTime();
      }

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
          await xoaGhiChu(id);
          taiDuLieu();
        },
      },
    ]);
  };

  // Hàm xóa bộ lọc
  const xoaBoLoc = () => {
    setTuKhoaTimKiem('');
    router.setParams({ search: undefined }); // Xóa param khỏi URL
  };

  // Lọc danh sách dựa trên từ khóa
  const danhSachHienThi = danhSachGhiChu.filter((gh) => {
    if (!tuKhoaTimKiem) return true;
    const tk = tuKhoaTimKiem.toLowerCase();
    return gh.tieuDe.toLowerCase().includes(tk) || gh.noiDung.toLowerCase().includes(tk);
  });

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
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => router.push('/chat')}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 16, color: MAU_SAC.nhanManh, fontWeight: '600' }}>Chat AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/add-note')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={kieu.nutThem}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thanh thông báo tìm kiếm */}
      {tuKhoaTimKiem ? (
        <View style={kieu.thanhTimKiem}>
          <Text style={kieu.chuTimKiem}>Kết quả cho: "{tuKhoaTimKiem}"</Text>
          <TouchableOpacity onPress={xoaBoLoc}>
            <Text style={kieu.nutXoaLoc}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {danhSachHienThi.length === 0 ? (
        <View style={kieu.trangThaiTrong}>
          <Text style={kieu.tieuDeTrong}>
            {tuKhoaTimKiem ? 'Không tìm thấy ghi chú nào' : CHU.trangChu.trong}
          </Text>
          {!tuKhoaTimKiem && <Text style={kieu.phuDeTrong}>{CHU.trangChu.phuDeTrong}</Text>}
        </View>
      ) : (
        <FlatList
          data={danhSachHienThi}
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
  // Style cho thanh tìm kiếm
  thanhTimKiem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E5F1FF', // Màu xanh nhạt
    marginHorizontal: KHOANG_CACH.lon,
    padding: KHOANG_CACH.vua,
    borderRadius: 8,
    marginBottom: KHOANG_CACH.trung,
  },
  chuTimKiem: {
    fontSize: 14,
    color: MAU_SAC.nhanManh,
    fontWeight: '500',
    flex: 1,
  },
  nutXoaLoc: {
    fontSize: 14,
    color: MAU_SAC.nguyHiem,
    fontWeight: 'bold',
  },
});