// src/app/chat.tsx
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react'; // Bổ sung useRef, useEffect
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { phanTichCauLenh } from '../services/geminiService';
// Bổ sung layDanhSach, xoaGhiChu
import { layDanhSach, luuGhiChu, xoaGhiChu } from '../storage/noteStorage';
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
    { 
      id: '1', 
      vaiTro: 'heThong', 
      noiDung: 'Chào bạn! Tôi là trợ lý AI. Bạn có thể nhắn: "Nhắc tôi họp team lúc 3h chiều mai" hoặc "Xóa ghi chú đổ xăng".' 
    }
  ]);
  const [chuoiNhap, setChuoiNhap] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  
  // Ref để điều khiển FlatList tự động cuộn
  const flatListRef = useRef<FlatList>(null);

  // Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    if (tinNhan.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [tinNhan]);

  const khiGui = async () => {
    if (chuoiNhap.trim() === '' || dangXuLy) return;

    const noiDungNhap = chuoiNhap.trim();
    setChuoiNhap('');
    setDangXuLy(true);

    // Lấy 5 tin nhắn gần nhất làm ngữ cảnh
    const lichSuChat = tinNhan.slice(-5).map((tn) => ({
      vaiTro: tn.vaiTro,
      noiDung: tn.noiDung,
    }));

    // Hiển thị tin nhắn người dùng
    const tinNhanNguoiDung: TinNhan = {
      id: Date.now().toString(),
      vaiTro: 'nguoiDung',
      noiDung: noiDungNhap,
    };
    setTinNhan((cu) => [...cu, tinNhanNguoiDung]);

    // Gọi AI
    const ketQua = await phanTichCauLenh(noiDungNhap, lichSuChat);

    if (ketQua) {
      // TRƯỜNG HỢP 1: TẠO GHI CHÚ MỚI
      if (ketQua.action === 'tao_moi' && ketQua.ghiChu) {
        try {
          const thoiGianHienTai = Date.now();
          await luuGhiChu({
            id: taoId(),
            tieuDe: ketQua.ghiChu.tieuDe || 'Ghi chú từ AI',
            noiDung: ketQua.ghiChu.noiDung || '',
            thoiGianNhac: ketQua.ghiChu.thoiGianNhac || undefined,
            ngayTao: thoiGianHienTai,
            ngayCapNhat: thoiGianHienTai,
          });

          const tinNhanHeThong: TinNhan = {
            id: (Date.now() + 1).toString(),
            vaiTro: 'heThong',
            noiDung: `✅ Đã tạo ghi chú thành công!\n- Tiêu đề: ${ketQua.ghiChu.tieuDe}\n- Nhắc việc: ${ketQua.ghiChu.thoiGianNhac ? new Date(ketQua.ghiChu.thoiGianNhac).toLocaleString('vi-VN') : 'Không có'}`,
          };
          setTinNhan((cu) => [...cu, tinNhanHeThong]);
        } catch (loi) {
          Alert.alert('Lỗi', 'Không thể lưu ghi chú vào cơ sở dữ liệu.');
        }
      } 
      // TRƯỜNG HỢP 2: AI HỎI LẠI HOẶC TRÒ CHUYỆN
      else if (ketQua.action === 'hoi_lai' || ketQua.action === 'tro_chuyen') {
        const tinNhanHeThong: TinNhan = {
          id: (Date.now() + 1).toString(),
          vaiTro: 'heThong',
          noiDung: ketQua.reply,
        };
        setTinNhan((cu) => [...cu, tinNhanHeThong]);
      }
      // TRƯỜNG HỢP 3: XÓA GHI CHÚ (ĐÃ CÓ LOGIC THỰC TẾ)
      else if (ketQua.action === 'xoa' && ketQua.tuKhoaXoa) {
        try {
          // 1. Lấy toàn bộ danh sách ghi chú từ Firebase
          const tatCaGhiChu = await layDanhSach();
          
          // 2. Tìm các ghi chú có chứa từ khóa (không phân biệt hoa thường)
          const tuKhoa = ketQua.tuKhoaXoa.toLowerCase();
          const ghiChuCanXoa = tatCaGhiChu.filter(
            (n) => n.tieuDe.toLowerCase().includes(tuKhoa) || n.noiDung.toLowerCase().includes(tuKhoa)
          );

          // 3. Tiến hành xóa
          if (ghiChuCanXoa.length > 0) {
            for (const ghiChu of ghiChuCanXoa) {
              await xoaGhiChu(ghiChu.id); // Xóa trên Firebase
            }
            setTinNhan((cu) => [...cu, { 
              id: Date.now().toString(), 
              vaiTro: 'heThong', 
              noiDung: `🗑️ Đã xóa thành công ${ghiChuCanXoa.length} ghi chú chứa từ khóa "${ketQua.tuKhoaXoa}".` 
            }]);
          } else {
            setTinNhan((cu) => [...cu, { 
              id: Date.now().toString(), 
              vaiTro: 'heThong', 
              noiDung: `🔍 Không tìm thấy ghi chú nào chứa từ khóa "${ketQua.tuKhoaXoa}".` 
            }]);
          }
        } catch (loi) {
          setTinNhan((cu) => [...cu, { 
            id: Date.now().toString(), 
            vaiTro: 'heThong', 
            noiDung: '❌ Lỗi khi xóa ghi chú.' 
          }]);
        }
      }
    } 
    // TRƯỜNG HỢP 4: LỖI MẠNG / AI KHÔNG PHẢN HỒI
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
        
        {/* Header */}
        <View style={kieu.thanhTieuDe}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={kieu.nutDong}>Đóng</Text>
          </TouchableOpacity>
          <Text style={KIEU_CHU.tieuDe}>Trợ lý AI</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Danh sách tin nhắn - Đã gắn ref để tự cuộn */}
        <FlatList
          ref={flatListRef}
          data={tinNhan}
          keyExtractor={(item) => item.id}
          renderItem={renderTinNhan}
          contentContainerStyle={kieu.danhSachTinNhan}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Vòng xoay loading khi AI đang suy nghĩ */}
        {dangXuLy && (
          <View style={{ padding: 10, alignItems: 'flex-start', paddingHorizontal: 24 }}>
            <ActivityIndicator size="small" color={MAU_SAC.nhanManh} />
          </View>
        )}

        {/* Khung nhập tin nhắn */}
        <View style={kieu.khungNhap}>
          <TextInput
            style={kieu.oNhap}
            placeholder="Nhập câu lệnh..."
            placeholderTextColor={MAU_SAC.chuPhu}
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