import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconDong, IconThem, IconTimKiem } from '../../components/Icons';
import TheGhiChu from '../../components/NoteCard';
import { CHU } from '../../constants/vi';
import { layDanhSach, xoaGhiChu } from '../../storage/noteStorage';
import { DO_BO_GOC, KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../../theme';
import { GhiChu } from '../../types';

dayjs.extend(relativeTime);
dayjs.locale('vi');

type TabBoLoc = 'tatCa' | 'homNay' | 'coNhac';

export default function ManHinhGhiChu() {
  const router = useRouter();
  const [danhSachGhiChu, setDanhSachGhiChu] = useState<GhiChu[]>([]);
  const [boLocHienTai, setBoLocHienTai] = useState<TabBoLoc>('tatCa');

  // Lấy tham số search từ URL nếu AI điều hướng tới
  const { search } = useLocalSearchParams<{ search?: string }>();
  const [tuKhoaTimKiem, setTuKhoaTimKiem] = useState(search || '');

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

  const xoaBoLoc = () => {
    setTuKhoaTimKiem('');
    router.setParams({ search: undefined });
  };

  // Tính số lượng công việc hôm nay
  const soViecHomNay = useMemo(() => {
    const homNay = dayjs();
    return danhSachGhiChu.filter((g) => {
      if (!g.thoiGianNhac) return false;
      return dayjs(g.thoiGianNhac).isSame(homNay, 'day');
    }).length;
  }, [danhSachGhiChu]);

  // Lọc danh sách theo Tab bộ lọc và từ khóa
  const danhSachHienThi = useMemo(() => {
    return danhSachGhiChu.filter((gh) => {
      // Lọc theo từ khóa
      if (tuKhoaTimKiem) {
        const tk = tuKhoaTimKiem.toLowerCase();
        const khopTieuDe = gh.tieuDe.toLowerCase().includes(tk);
        const khopNoiDung = gh.noiDung.toLowerCase().includes(tk);
        if (!khopTieuDe && !khopNoiDung) return false;
      }

      // Lọc theo Tab chip
      if (boLocHienTai === 'homNay') {
        if (!gh.thoiGianNhac) return false;
        return dayjs(gh.thoiGianNhac).isSame(dayjs(), 'day');
      }

      if (boLocHienTai === 'coNhac') {
        return !!gh.thoiGianNhac;
      }

      return true;
    });
  }, [danhSachGhiChu, tuKhoaTimKiem, boLocHienTai]);

  const renderThe: ListRenderItem<GhiChu> = ({ item }) => {
    let chuoiThoiGianHienThi: string = CHU.trangChu.khongNhac;
    let trangThai: 'quaHan' | 'homNay' | 'sapToi' | 'khongNhac' = 'khongNhac';

    if (item.thoiGianNhac) {
      const thoiGian = dayjs(item.thoiGianNhac);
      const bayGio = dayjs();

      if (thoiGian.isBefore(bayGio, 'minute')) {
        trangThai = 'quaHan';
        chuoiThoiGianHienThi = `Trễ: ${thoiGian.format('DD/MM, HH:mm')}`;
      } else if (thoiGian.isSame(bayGio, 'day')) {
        trangThai = 'homNay';
        chuoiThoiGianHienThi = `Hôm nay, ${thoiGian.format('HH:mm')}`;
      } else {
        trangThai = 'sapToi';
        chuoiThoiGianHienThi = thoiGian.format('DD/MM/YYYY, HH:mm');
      }
    }

    return (
      <TheGhiChu
        ghiChu={item}
        chuoiThoiGianHienThi={chuoiThoiGianHienThi}
        trangThai={trangThai}
        khiBam={() => router.push(`/add-note?id=${item.id}`)}
        khiGiu={() => xacNhanXoa(item.id)}
      />
    );
  };

  return (
    <SafeAreaView style={kieu.khungChua} edges={['top', 'left', 'right']}>
      {/* Header chính */}
      <View style={kieu.thanhTieuDe}>
        <View>
          <Text style={kieu.chaoHoi}>Xin chào 👋</Text>
          <Text style={KIEU_CHU.tieuDeLon}>Ghi chú & Nhắc việc</Text>
          <Text style={kieu.thongKe}>
            {soViecHomNay > 0
              ? `Hôm nay bạn có ${soViecHomNay} việc cần làm`
              : 'Không có việc nào cần làm hôm nay'}
          </Text>
        </View>

        <TouchableOpacity
          style={kieu.nutThem}
          onPress={() => router.push('/add-note')}
          activeOpacity={0.8}
        >
          <IconThem size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm nhanh */}
      <View style={kieu.hopTimKiem}>
        <IconTimKiem size={18} color={MAU_SAC.chuPhu} />
        <TextInput
          style={kieu.oTimKiem}
          placeholder="Tìm kiếm ghi chú, nội dung..."
          placeholderTextColor={MAU_SAC.chuMo}
          value={tuKhoaTimKiem}
          onChangeText={setTuKhoaTimKiem}
        />
        {tuKhoaTimKiem ? (
          <TouchableOpacity onPress={xoaBoLoc}>
            <IconDong size={16} color={MAU_SAC.chuPhu} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Chip bộ lọc nhanh */}
      <View style={kieu.hangBoLoc}>
        <TouchableOpacity
          style={[kieu.chipBoLoc, boLocHienTai === 'tatCa' && kieu.chipDangChon]}
          onPress={() => setBoLocHienTai('tatCa')}
        >
          <Text
            style={[
              kieu.chuChipBoLoc,
              boLocHienTai === 'tatCa' && kieu.chuChipDangChon,
            ]}
          >
            Tất cả ({danhSachGhiChu.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[kieu.chipBoLoc, boLocHienTai === 'homNay' && kieu.chipDangChon]}
          onPress={() => setBoLocHienTai('homNay')}
        >
          <Text
            style={[
              kieu.chuChipBoLoc,
              boLocHienTai === 'homNay' && kieu.chuChipDangChon,
            ]}
          >
            Hôm nay ({soViecHomNay})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[kieu.chipBoLoc, boLocHienTai === 'coNhac' && kieu.chipDangChon]}
          onPress={() => setBoLocHienTai('coNhac')}
        >
          <Text
            style={[
              kieu.chuChipBoLoc,
              boLocHienTai === 'coNhac' && kieu.chuChipDangChon,
            ]}
          >
            Có hẹn giờ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách ghi chú */}
      {danhSachHienThi.length === 0 ? (
        <View style={kieu.trangThaiTrong}>
          <Text style={kieu.tieuDeTrong}>
            {tuKhoaTimKiem ? 'Không tìm thấy ghi chú phù hợp' : CHU.trangChu.trong}
          </Text>
          <Text style={kieu.phuDeTrong}>
            {tuKhoaTimKiem
              ? 'Thử tìm với từ khóa khác'
              : 'Bấm nút + ở góc trên hoặc nói với Trợ lý AI để tạo nhắc việc.'}
          </Text>
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
  khungChua: {
    flex: 1,
    backgroundColor: MAU_SAC.nen,
  },
  thanhTieuDe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: KHOANG_CACH.lon,
    paddingTop: KHOANG_CACH.trung,
    paddingBottom: KHOANG_CACH.vua,
  },
  chaoHoi: {
    fontSize: 14,
    fontWeight: '600',
    color: MAU_SAC.nhanManh,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  thongKe: {
    fontSize: 13,
    color: MAU_SAC.chuPhu,
    marginTop: 2,
  },
  nutThem: {
    width: 44,
    height: 44,
    borderRadius: DO_BO_GOC.trung,
    backgroundColor: MAU_SAC.nhanManh,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MAU_SAC.nhanManh,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  hopTimKiem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MAU_SAC.beMat,
    marginHorizontal: KHOANG_CACH.lon,
    marginTop: KHOANG_CACH.vua,
    paddingHorizontal: KHOANG_CACH.trung,
    paddingVertical: 10,
    borderRadius: DO_BO_GOC.vua + 2,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
  },
  oTimKiem: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: MAU_SAC.chuChinh,
  },
  hangBoLoc: {
    flexDirection: 'row',
    paddingHorizontal: KHOANG_CACH.lon,
    marginVertical: KHOANG_CACH.trung,
  },
  chipBoLoc: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
    marginRight: KHOANG_CACH.vua,
  },
  chipDangChon: {
    backgroundColor: MAU_SAC.nhanManh,
    borderColor: MAU_SAC.nhanManh,
  },
  chuChipBoLoc: {
    fontSize: 13,
    fontWeight: '500',
    color: MAU_SAC.chuPhu,
  },
  chuChipDangChon: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noiDungDanhSach: {
    paddingHorizontal: KHOANG_CACH.lon,
    paddingBottom: 90,
  },
  trangThaiTrong: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  tieuDeTrong: {
    fontSize: 17,
    fontWeight: '600',
    color: MAU_SAC.chuChinh,
    marginBottom: KHOANG_CACH.vua,
    textAlign: 'center',
  },
  phuDeTrong: {
    fontSize: 14,
    color: MAU_SAC.chuPhu,
    textAlign: 'center',
    lineHeight: 20,
  },
});
