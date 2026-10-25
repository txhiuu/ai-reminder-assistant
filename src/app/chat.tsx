import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { phanTichCauLenh } from '../services/geminiService';
import { layLichSuChat, luuLichSuChat, xoaLichSuChat } from '../storage/chatStorage';
import { layDanhSach, luuGhiChu, xoaGhiChu } from '../storage/noteStorage';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { TinNhan } from '../types';
import { taoId } from '../utils/generateId';

export default function ManHinhChat() {
  const router = useRouter();
  
  //Khởi tạo mảng rỗng, sẽ load từ Storage
  const [tinNhan, setTinNhan] = useState<TinNhan[]>([]);
  const [chuoiNhap, setChuoiNhap] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  //Load lịch sử khi mở app
  useEffect(() => {
    const khoiTaoChat = async () => {
      const lichSu = await layLichSuChat();
      if (lichSu.length > 0) {
        setTinNhan(lichSu);
      } else {
        setTinNhan([{ 
          id: '1', 
          vaiTro: 'heThong', 
          noiDung: 'Chào bạn! Tôi là trợ lý AI. Bạn có thể nhắn: "Nhắc tôi họp team lúc 3h chiều mai" hoặc "Cho tôi xem ghi chú ăn sáng".',
          thoiGian: Date.now()
        }]);
      }
    };
    khoiTaoChat();
  }, []);

  //Tự động lưu mỗi khi có tin nhắn mới
  useEffect(() => {
    if (tinNhan.length > 0) {
      luuLichSuChat(tinNhan);
    }
  }, [tinNhan]);

  const scrollToBottom = () => {
    if (flatListRef.current && tinNhan.length > 0) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [tinNhan]);

  //Hàm làm mới chat
  const lamMoiChat = () => {
    Alert.alert(
      'Làm mới cuộc trò chuyện',
      'Bạn có chắc muốn xóa toàn bộ lịch sử chat hiện tại?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            await xoaLichSuChat();
            setTinNhan([{ 
              id: Date.now().toString(), 
              vaiTro: 'heThong', 
              noiDung: 'Đã làm mới cuộc trò chuyện. Tôi có thể giúp gì cho bạn?',
              thoiGian: Date.now()
            }]);
          }
        }
      ]
    );
  };

  const khiGui = async () => {
    if (chuoiNhap.trim() === '' || dangXuLy) return;

    const noiDungNhap = chuoiNhap.trim();
    setChuoiNhap('');
    setDangXuLy(true);

    const lichSuChat = tinNhan.slice(-5).map((tn) => ({
      vaiTro: tn.vaiTro,
      noiDung: tn.noiDung,
    }));

    const tinNhanNguoiDung: TinNhan = {
      id: Date.now().toString(),
      vaiTro: 'nguoiDung',
      noiDung: noiDungNhap,
      thoiGian: Date.now()
    };
    setTinNhan((cu) => [...cu, tinNhanNguoiDung]);

    // Gọi AI
    const ketQua = await phanTichCauLenh(noiDungNhap, lichSuChat);

    if (ketQua && Array.isArray(ketQua) && ketQua.length > 0) {
      for (const hanhDong of ketQua) {
        // TẠO GHI CHÚ
        if (hanhDong.action === 'tao_moi' && hanhDong.ghiChu) {
          try {
            const thoiGianHienTai = Date.now();
            await luuGhiChu({
              id: taoId(),
              tieuDe: hanhDong.ghiChu.tieuDe || 'Ghi chú từ AI',
              noiDung: hanhDong.ghiChu.noiDung || '',
              thoiGianNhac: hanhDong.ghiChu.thoiGianNhac || undefined,
              ngayTao: thoiGianHienTai,
              ngayCapNhat: thoiGianHienTai,
            });

            setTinNhan((cu) => [...cu, { 
              id: Date.now().toString(), 
              vaiTro: 'heThong', 
              noiDung: `✅ Đã tạo ghi chú: ${hanhDong.ghiChu?.tieuDe}`,
              thoiGian: Date.now()
            }]);
          } catch (loi) {
            setTinNhan((cu) => [...cu, { id: Date.now().toString(), vaiTro: 'heThong', noiDung: '❌ Lỗi lưu ghi chú.', thoiGian: Date.now() }]);
          }
        }

        // XÓA GHI CHÚ
        else if (hanhDong.action === 'xoa' && hanhDong.tuKhoaXoa) {
          try {
            const tatCaGhiChu = await layDanhSach();
            const tuKhoa = hanhDong.tuKhoaXoa.toLowerCase();
            const ghiChuCanXoa = tatCaGhiChu.filter(
              (n) => n.tieuDe.toLowerCase().includes(tuKhoa) || n.noiDung.toLowerCase().includes(tuKhoa)
            );

            if (ghiChuCanXoa.length > 0) {
              for (const ghiChu of ghiChuCanXoa) {
                await xoaGhiChu(ghiChu.id);
              }
              setTinNhan((cu) => [...cu, { 
                id: Date.now().toString(), 
                vaiTro: 'heThong', 
                noiDung: `🗑️ Đã xóa ${ghiChuCanXoa.length} ghi chú chứa từ khóa "${hanhDong.tuKhoaXoa}".`,
                thoiGian: Date.now()
              }]);
            } else {
              setTinNhan((cu) => [...cu, { 
                id: Date.now().toString(), 
                vaiTro: 'heThong', 
                noiDung: `🔍 Không tìm thấy ghi chú chứa "${hanhDong.tuKhoaXoa}".`,
                thoiGian: Date.now()
              }]);
            }
          } catch (loi) {
            setTinNhan((cu) => [...cu, { id: Date.now().toString(), vaiTro: 'heThong', noiDung: '❌ Lỗi xóa ghi chú.', thoiGian: Date.now() }]);
          }
        }

        // XEM/TÌM GHI CHÚ
        else if (hanhDong.action === 'xem_ghi_chu' && hanhDong.tuKhoaXem) {
          try {
            const tatCaGhiChu = await layDanhSach();
            const tuKhoa = hanhDong.tuKhoaXem.toLowerCase();
            
            const coGhiChu = tatCaGhiChu.some(
              (n) => n.tieuDe.toLowerCase().includes(tuKhoa) || n.noiDung.toLowerCase().includes(tuKhoa)
            );

            if (coGhiChu) {
              router.replace({ pathname: '/', params: { search: hanhDong.tuKhoaXem } });
            } else {
              setTinNhan((cu) => [...cu, { 
                id: Date.now().toString(), 
                vaiTro: 'heThong', 
                noiDung: `🔍 Không tìm thấy ghi chú nào chứa từ khóa "${hanhDong.tuKhoaXem}".`,
                thoiGian: Date.now()
              }]);
            }
          } catch (loi) {
            setTinNhan((cu) => [...cu, { id: Date.now().toString(), vaiTro: 'heThong', noiDung: '❌ Lỗi khi tìm ghi chú.', thoiGian: Date.now() }]);
          }
        }

        // HỎI LẠI HOẶC TRÒ CHUYỆN
        else if (hanhDong.action === 'hoi_lai' || hanhDong.action === 'tro_chuyen') {
          setTinNhan((cu) => [...cu, { 
            id: Date.now().toString(), 
            vaiTro: 'heThong', 
            noiDung: hanhDong.reply,
            thoiGian: Date.now()
          }]);
        }
      }
    } 
    // LỖI
    else {
      setTinNhan((cu) => [...cu, {
        id: (Date.now() + 1).toString(),
        vaiTro: 'heThong',
        noiDung: '❌ Xin lỗi, tôi không hiểu ý bạn hoặc có lỗi mạng. Vui lòng thử lại.',
        thoiGian: Date.now()
      }]);
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
        
        {/* Thêm nút Làm mới trên Header */}
        <View style={kieu.thanhTieuDe}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={kieu.nutDong}>Đóng</Text>
          </TouchableOpacity>
          
          <Text style={KIEU_CHU.tieuDe}>Trợ lý AI</Text>
          
          <TouchableOpacity onPress={lamMoiChat}>
            <Text style={kieu.nutLamMoi}>Làm mới</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={tinNhan}
          keyExtractor={(item) => item.id}
          renderItem={renderTinNhan}
          contentContainerStyle={kieu.danhSachTinNhan}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          keyboardDismissMode="on-drag"
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
  nutLamMoi: { fontSize: 16, color: MAU_SAC.nguyHiem, fontWeight: '600' }, // Style cho nút làm mới
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