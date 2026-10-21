import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { phanTichCauLenh } from '../services/geminiService';
import { luuGhiChu } from '../storage/noteStorage';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { taoId } from '../utils/generateId';

interface TinNhan {
  id: string;
  vaiTro: 'nguoiDung' | 'heThong';
  noiDung: string;
}

export default function ManHinhChat() {
  const router = useRouter();
  const [tinNhan, setTinNhan] = useState<TinNhan[]>([
    { id: '1', vaiTro: 'heThong', noiDung: 'Chào bạn! Hãy nhập câu lệnh, tôi sẽ tự động tạo ghi chú cho bạn. VD: "Nhắc tôi họp team lúc 3h chiều mai"' }
  ]);
  const [chuoiNhap, setChuoiNhap] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);

  const khiGui = async () => {
    if (chuoiNhap.trim() === '' || dangXuLy) return;

    const noiDungNhap = chuoiNhap.trim();
    setChuoiNhap('');
    setDangXuLy(true);

    const tinNhanNguoiDung: TinNhan = {
      id: Date.now().toString(),
      vaiTro: 'nguoiDung',
      noiDung: noiDungNhap,
    };
    setTinNhan((cu) => [...cu, tinNhanNguoiDung]);

    const ketQua = await phanTichCauLenh(noiDungNhap);

    if (ketQua) {
      try {
        const thoiGianHienTai = Date.now();
        await luuGhiChu({
          id: taoId(),
          tieuDe: ketQua.tieuDe || 'Ghi chú từ AI',
          noiDung: ketQua.noiDung || '',
          thoiGianNhac: ketQua.thoiGianNhac || undefined,
          ngayTao: thoiGianHienTai,
          ngayCapNhat: thoiGianHienTai,
        });

        const tinNhanHeThong: TinNhan = {
          id: (Date.now() + 1).toString(),
          vaiTro: 'heThong',
          noiDung: `✅ Đã tạo ghi chú thành công!\n- Tiêu đề: ${ketQua.tieuDe}\n- Nhắc việc: ${ketQua.thoiGianNhac ? new Date(ketQua.thoiGianNhac).toLocaleString('vi-VN') : 'Không có'}`,
        };
        setTinNhan((cu) => [...cu, tinNhanHeThong]);
      } catch (loi) {
        Alert.alert('Lỗi', 'Không thể lưu ghi chú vào cơ sở dữ liệu.');
      }
    }
    else {
      const tinNhanLoi: TinNhan = {
        id: (Date.now() + 1).toString(),
        vaiTro: 'heThong',
        noiDung: '❌ Xin lỗi, tôi không hiểu ý bạn hoặc có lỗi mạng. Vui lòng thử lại.',
      };
      setTinNhan((cu) => [...cu, tinNhanLoi]);
    }

    setDangXuLy(false);
  };

  const renderTinNhan = ({ item }: { item: TinNhan }) => {
    const laNguoiDung = item.vaiTro === 'nguoiDung';
    return (
      <View style={[kieu.hopTinNhan, laNguoiDung ? kieu.tinNguoiDung : kieu.tinHeThong]}>
        <Text style={[kieu.chuTinNhan, laNguoiDung && kieu.chuNguoiDung]}>
          {item.noiDung}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={kieu.khungChua}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={kieu.thanhTieuDe}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={kieu.nutDong}>Đóng</Text>
          </TouchableOpacity>
          <Text style={KIEU_CHU.tieuDe}>Trợ lý AI</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={tinNhan}
          keyExtractor={(item) => item.id}
          renderItem={renderTinNhan}
          contentContainerStyle={kieu.danhSachTinNhan}
        />
        {dangXuLy && (
          <View style={{ padding: 10, alignItems: 'flex-start', paddingHorizontal: 24 }}>
            <ActivityIndicator size="small" color={MAU_SAC.nhanManh} />
          </View>
        )}

        <View style={kieu.khungNhap}>
          <TextInput
            style={kieu.oNhap}
            placeholder="Nhập câu lệnh..."
            value={chuoiNhap}
            onChangeText={setChuoiNhap}
            onSubmitEditing={khiGui}
            editable={!dangXuLy}
          />
          <TouchableOpacity
            style={[kieu.nutGui, dangXuLy && { opacity: 0.5 }]}
            onPress={khiGui}
            disabled={dangXuLy}
          >
            <Text style={kieu.chuNutGui}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const kieu = StyleSheet.create({
  khungChua: { flex: 1, backgroundColor: MAU_SAC.nen },
  thanhTieuDe: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: KHOANG_CACH.lon, paddingVertical: KHOANG_CACH.trung,
    borderBottomWidth: 1, borderBottomColor: MAU_SAC.vien,
  },
  nutDong: { fontSize: 16, color: MAU_SAC.nhanManh },
  danhSachTinNhan: { padding: KHOANG_CACH.lon, paddingBottom: KHOANG_CACH.trung },
  hopTinNhan: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: KHOANG_CACH.trung },
  tinNguoiDung: { alignSelf: 'flex-end', backgroundColor: MAU_SAC.nhanManh, borderBottomRightRadius: 4 },
  tinHeThong: { alignSelf: 'flex-start', backgroundColor: MAU_SAC.beMat, borderWidth: 1, borderColor: MAU_SAC.vien, borderBottomLeftRadius: 4 },
  chuTinNhan: { fontSize: 16, color: MAU_SAC.chuChinh, lineHeight: 22 },
  chuNguoiDung: { color: '#FFFFFF' },
  khungNhap: {
    flexDirection: 'row', padding: KHOANG_CACH.trung, backgroundColor: MAU_SAC.beMat,
    borderTopWidth: 1, borderTopColor: MAU_SAC.vien, alignItems: 'center',
  },
  oNhap: {
    flex: 1, backgroundColor: MAU_SAC.nen, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 16, color: MAU_SAC.chuChinh, maxHeight: 100,
  },
  nutGui: { marginLeft: KHOANG_CACH.vua, backgroundColor: MAU_SAC.nhanManh, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  chuNutGui: { color: '#FFFFFF', fontWeight: '600' },
});