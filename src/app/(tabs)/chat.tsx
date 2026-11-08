import { AudioStudioModule, useAudioRecorder } from '@siteed/audio-studio';
import base64 from 'base64-js';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconAI, IconGui, IconLamMoi, IconMicro, IconTick, IconXoa } from '../../components/Icons';
import { socketService, type TrangThaiKetNoi } from '../../services/liveSocketService';
import { layLichSuChat, luuLichSuChat, xoaLichSuChat } from '../../storage/chatStorage';
import { layDanhSach, luuGhiChu, xoaGhiChu } from '../../storage/noteStorage';
import { DO_BO_GOC, KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../../theme';
import { TinNhan } from '../../types';
import { taoId } from '../../utils/generateId';

function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const pcmBuffer = base64.toByteArray(pcmBase64);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmArray = new Uint8Array(pcmBuffer);
  new Uint8Array(buffer, 44).set(pcmArray);

  return base64.fromByteArray(new Uint8Array(buffer));
}

const GOI_Y_NHANH = ['Nhắc tôi chiều nay', 'Tìm ghi chú', 'Hôm nay có gì?'];

export default function ManHinhChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tinNhan, setTinNhan] = useState<TinNhan[]>([]);
  const [chuoiNhap, setChuoiNhap] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [dangGhiAm, setDangGhiAm] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [trangThaiKetNoi, setTrangThaiKetNoi] = useState<TrangThaiKetNoi>('dangKetNoi');

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  const player = useAudioPlayer();
  const audioRecorder = useAudioRecorder();

  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const dangGopText = useRef(false);
  const isPlayingAudioRef = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    const ngungTheoDoiKetNoi = socketService.onConnectionState(setTrangThaiKetNoi);
    const initSocket = async () => {
      try {
        await socketService.connect();
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể kết nối với Trợ lý AI.');
      }
    };
    initSocket();

    socketService.onAudioData(async (base64Audio) => {
      if (isPlayingAudioRef.current) return;

      try {
        isPlayingAudioRef.current = true;
        setDangXuLy(false);

        const wavBase64 = pcmToWav(base64Audio, 24000);
        const fileUri = FileSystem.cacheDirectory + `ai_voice_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        player.replace({ uri: fileUri });
        player.play();
      } catch (error) {
        console.log('Lỗi phát âm thanh:', error);
      } finally {
        setTimeout(() => {
          isPlayingAudioRef.current = false;
        }, 500);
      }
    });

    socketService.onText((text) => {
      setDangXuLy(false);
      setTinNhan((cu) => {
        const lastMsg = cu[cu.length - 1];

        if (
          dangGopText.current &&
          lastMsg &&
          lastMsg.vaiTro === 'heThong' &&
          Date.now() - lastMsg.thoiGian < 5000
        ) {
          const updatedMsg = {
            ...lastMsg,
            noiDung: lastMsg.noiDung + ' ' + text,
            thoiGian: Date.now(),
          };
          return [...cu.slice(0, -1), updatedMsg];
        } else {
          dangGopText.current = true;
          return [
            ...cu,
            {
              id: taoId(),
              vaiTro: 'heThong',
              noiDung: text,
              thoiGian: Date.now(),
            },
          ];
        }
      });
    });

    socketService.onFunctionCall(async (name, args) => {
      let resultMessage = 'Thành công';
      setDangXuLy(true);
      dangGopText.current = false;

      try {
        if (name === 'tao_ghi_chu') {
          const ghiChuId = taoId();
          await luuGhiChu({
            id: ghiChuId,
            tieuDe: args.tieuDe,
            noiDung: args.noiDung || '',
            thoiGianNhac: args.thoiGianNhac || undefined,
            ngayTao: Date.now(),
            ngayCapNhat: Date.now(),
          });
          setTinNhan((cu) => [
            ...cu,
            {
              id: taoId(),
              vaiTro: 'heThong',
              noiDung: '✅ Đã tạo ghi chú: ' + args.tieuDe,
              thoiGian: Date.now(),
              ghiChuId,
            },
          ]);
        } else if (name === 'xoa_ghi_chu') {
          const tatCaGhiChu = await layDanhSach();
          const tuKhoa = args.tuKhoaXoa.toLowerCase();
          const ghiChuCanXoa = tatCaGhiChu.filter(
            (n) => n.tieuDe.toLowerCase().includes(tuKhoa) || n.noiDung.toLowerCase().includes(tuKhoa)
          );

          if (ghiChuCanXoa.length > 0) {
            for (const ghiChu of ghiChuCanXoa) await xoaGhiChu(ghiChu.id);
            setTinNhan((cu) => [
              ...cu,
              {
                id: taoId(),
                vaiTro: 'heThong',
                noiDung: `🗑️ Đã xóa ${ghiChuCanXoa.length} ghi chú.`,
                thoiGian: Date.now(),
              },
            ]);
            resultMessage = 'Đã xóa thành công';
          } else {
            setTinNhan((cu) => [
              ...cu,
              {
                id: taoId(),
                vaiTro: 'heThong',
                noiDung: `🔍 Không tìm thấy ghi chú.`,
                thoiGian: Date.now(),
              },
            ]);
            resultMessage = 'Không tìm thấy ghi chú để xóa';
          }
        } else if (name === 'xem_ghi_chu') {
          router.replace({ pathname: '/', params: { search: args.tuKhoaXem } });
          resultMessage = 'Đã mở màn hình tìm kiếm';
        }
      } catch (e) {
        resultMessage = 'Thất bại';
      }

      socketService.sendFunctionResponse(name, { success: true, message: resultMessage });
      setDangXuLy(false);
    });

    return () => {
      ngungTheoDoiKetNoi();
      // socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const khoiTaoChat = async () => {
      const lichSu = await layLichSuChat();
      if (lichSu.length > 0) {
        setTinNhan(lichSu);
      } else {
        setTinNhan([
          {
            id: taoId(),
            vaiTro: 'heThong',
            noiDung:
              'Chào bạn! Tôi là trợ lý AI. Bạn có thể nhấn giữ nút Micro để ra lệnh bằng giọng nói hoặc gõ tin nhắn.',
            thoiGian: Date.now(),
          },
        ]);
      }
    };
    khoiTaoChat();
  }, []);

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

  const lamMoiChat = () => {
    Alert.alert('Làm mới', 'Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await xoaLichSuChat();
          setTinNhan([
            {
              id: taoId(),
              vaiTro: 'heThong',
              noiDung: 'Đã làm mới cuộc trò chuyện. Bạn cần tôi hỗ trợ việc gì?',
              thoiGian: Date.now(),
            },
          ]);
        },
      },
    ]);
  };

  const khiGui = async () => {
    if (chuoiNhap.trim() === '' || dangXuLy) return;

    const noiDungNhap = chuoiNhap.trim();
    setChuoiNhap('');
    setDangXuLy(true);
    dangGopText.current = false;

    setTinNhan((cu) => [
      ...cu,
      { id: taoId(), vaiTro: 'nguoiDung', noiDung: noiDungNhap, thoiGian: Date.now() },
    ]);

    socketService.sendText(noiDungNhap);
  };

  const batDauGhiAm = async () => {
    if (isRecordingRef.current || isStoppingRef.current || dangXuLy) return;

    try {
      await socketService.connect();
    } catch (e) {
      Alert.alert('Lỗi mạng', 'Không thể kết nối lại với Trợ lý AI.');
      return;
    }

    const { granted } = await AudioStudioModule.requestPermissionsAsync();
    if (!granted) {
      return Alert.alert('Lỗi', 'Cần quyền micro để ghi âm');
    }

    isRecordingRef.current = true;
    setDangGhiAm(true);
    dangGopText.current = false;

    try {
      if (player.playing) {
        player.pause();
      }

      // GỬI TÍN HIỆU BẮT ĐẦU NÓI (VAD THỦ CÔNG)
      socketService.sendActivityStart();

      await audioRecorder.startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 250,
        autoResumeAfterInterruption: true,
        keepAwake: true,
        onAudioStream: async (event: any) => {
          if (event.data && event.data.encoded) {
            socketService.sendAudio(event.data.encoded);
          }
        },
      });
    } catch (error) {
      console.log('Lỗi khi bắt đầu ghi âm:', error);
      isRecordingRef.current = false;
      setDangGhiAm(false);
    }
  };

  const dungGhiAm = async () => {
    if (!isRecordingRef.current || isStoppingRef.current) return;

    isRecordingRef.current = false;
    isStoppingRef.current = true;
    setDangGhiAm(false);
    setDangXuLy(true);

    try {
      // GỬI TÍN HIỆU KẾT THÚC NÓI (VAD THỦ CÔNG)
      socketService.sendActivityEnd();

      await audioRecorder.stopRecording();
    } catch (error) {
      console.log('Lỗi khi dừng ghi âm:', error);
    } finally {
      setTimeout(() => {
        isStoppingRef.current = false;
        setDangXuLy(false);
      }, 300);
    }
  };

  // Render từng tin nhắn với giao diện hiện đại & Action Cards
  const renderTinNhan = ({ item }: { item: TinNhan }) => {
    const laNguoiDung = item.vaiTro === 'nguoiDung';

    // Nhận diện Action Card đã tạo ghi chú
    const laActionTaoGhiChu = item.noiDung.startsWith('✅ Đã tạo ghi chú:');
    const laActionXoaGhiChu = item.noiDung.startsWith('🗑️ Đã xóa');

    if (laActionTaoGhiChu) {
      const tenGhiChu = item.noiDung.replace('✅ Đã tạo ghi chú:', '').trim();
      return (
        <View style={kieu.theHanhDongTao}>
          <View style={kieu.hangTheHanhDong}>
            <View style={kieu.iconHanhDongXanh}>
              <IconTick size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={kieu.tieuDeHanhDong}>Đã tạo ghi chú mới</Text>
              <Text style={kieu.tenGhiChuTao} numberOfLines={2}>
                "{tenGhiChu}"
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={kieu.nutXemNgay}
            onPress={() => item.ghiChuId
              ? router.push({ pathname: '/add-note', params: { id: item.ghiChuId } })
              : router.replace({ pathname: '/', params: { search: tenGhiChu } })}
          >
            <Text style={kieu.chuNutXemNgay}>Mở ghi chú vừa tạo →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (laActionXoaGhiChu) {
      return (
        <View style={kieu.theHanhDongXoa}>
          <View style={kieu.hangTheHanhDong}>
            <View style={kieu.iconHanhDongDo}>
              <IconXoa size={16} color="#FFFFFF" />
            </View>
            <Text style={kieu.chuHanhDongXoa}>{item.noiDung}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          kieu.hopTinNhan,
          laNguoiDung ? kieu.tinNguoiDung : kieu.tinHeThong,
        ]}
      >
        {!laNguoiDung && (
          <View style={kieu.badgeAI}>
            <IconAI size={13} color={MAU_SAC.nhanManh} />
            <Text style={kieu.chuBadgeAI}>AI</Text>
          </View>
        )}
        <Text style={[kieu.chuTinNhan, laNguoiDung && kieu.chuNguoiDung]}>
          {item.noiDung}
        </Text>
      </View>
    );
  };

  const trangThaiHienThi = dangGhiAm
    ? { nhan: 'Đang nghe', mau: '#DC2626', nen: '#FEF2F2' }
    : dangXuLy
      ? { nhan: 'Đang xử lý', mau: MAU_SAC.nhanManh, nen: MAU_SAC.nhanManhNhat }
      : trangThaiKetNoi === 'sanSang'
        ? { nhan: 'Sẵn sàng', mau: '#059669', nen: '#ECFDF5' }
        : trangThaiKetNoi === 'dangKetNoi'
          ? { nhan: 'Đang kết nối', mau: '#D97706', nen: '#FFFBEB' }
          : { nhan: 'Mất kết nối', mau: '#DC2626', nen: '#FEF2F2' };

  const hienGoiYNhanh =
    tinNhan.length > 0 && !tinNhan.some((message) => message.vaiTro === 'nguoiDung');

  const chonGoiYNhanh = (goiY: string) => {
    setChuoiNhap(goiY);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  return (
    <SafeAreaView style={kieu.khungChua} edges={['top', 'left', 'right']}>
      {/* Trên Android dùng paddingBottom động theo keyboardHeight */}
      <View style={[{ flex: 1 }, Platform.OS === 'android' && { paddingBottom: keyboardHeight }]}>
        {/* Header trợ lý và trạng thái kết nối */}
        <View style={kieu.thanhTieuDe}>
          <View style={kieu.khoiTieuDe}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={kieu.bieuTuongAI}
            >
              <IconAI size={21} color="#FFFFFF" />
            </LinearGradient>
            <View style={kieu.thongTinTieuDe}>
              <Text style={KIEU_CHU.tieuDe}>Trợ lý AI</Text>
              <View style={[kieu.pillTrangThai, { backgroundColor: trangThaiHienThi.nen }]}>
                <View style={[kieu.chamTrangThai, { backgroundColor: trangThaiHienThi.mau }]} />
                <Text style={[kieu.chuTrangThai, { color: trangThaiHienThi.mau }]}>
                  {trangThaiHienThi.nhan}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={kieu.nutLamMoi}
            onPress={lamMoiChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconLamMoi size={18} color={MAU_SAC.chuPhu} />
            <Text style={kieu.chuNutLamMoi}>Làm mới</Text>
          </TouchableOpacity>
        </View>
        {/* Danh sách tin nhắn */}
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={tinNhan}
          keyExtractor={(item) => item.id}
          renderItem={renderTinNhan}
          ListFooterComponent={
            hienGoiYNhanh ? (
              <View style={kieu.khoiGoiYNhanh}>
                <Text style={kieu.nhanGoiY}>Bạn có thể thử</Text>
                <View style={kieu.dongGoiY}>
                  {GOI_Y_NHANH.map((goiY) => (
                    <TouchableOpacity
                      key={goiY}
                      style={kieu.chipGoiY}
                      onPress={() => chonGoiYNhanh(goiY)}
                      activeOpacity={0.75}
                    >
                      <Text style={kieu.chuGoiY}>{goiY}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : undefined
          }
          contentContainerStyle={kieu.danhSachTinNhan}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          keyboardDismissMode="on-drag"
        />

        {/* Trạng thái AI đang xử lý */}
        {dangXuLy && (
          <View style={kieu.khungDangXuLy}>
            <ActivityIndicator size="small" color={MAU_SAC.nhanManh} />
            <Text style={kieu.chuDangXuLy}>Đang xử lý yêu cầu...</Text>
          </View>
        )}

        {/* Banner trạng thái khi đang ghi âm */}
        {dangGhiAm && (
          <View style={kieu.bannerGhiAm}>
            <View style={kieu.chamDoGhiAm} />
            <Text style={kieu.chuBannerGhiAm}>Đang nghe... Thả tay để gửi câu lệnh</Text>
          </View>
        )}

        {/* Khung nhập văn bản & nút Micro */}
        <View style={kieu.khungNhap}>
          <TextInput
            ref={inputRef}
            style={kieu.oNhap}
            placeholder="Nhập câu lệnh hoặc giữ Micro..."
            placeholderTextColor={MAU_SAC.chuMo}
            value={chuoiNhap}
            onChangeText={setChuoiNhap}
            onSubmitEditing={khiGui}
            editable={!dangXuLy && !dangGhiAm}
            multiline
          />

          {/* Nút Micro giữ để nói */}
          <TouchableOpacity
            style={[
              kieu.nutMicro,
              dangGhiAm && kieu.nutMicroDangNoi,
            ]}
            onPressIn={batDauGhiAm}
            onPressOut={dungGhiAm}
            disabled={dangXuLy}
            activeOpacity={0.8}
          >
            {dangGhiAm ? (
              <View style={kieu.khoiMicroDangNoi}>
                <IconMicro size={22} color="#FFFFFF" />
              </View>
            ) : (
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={kieu.gradientMicro}
              >
                <IconMicro size={20} color="#FFFFFF" />
              </LinearGradient>
            )}
          </TouchableOpacity>

          {/* Nút Gửi */}
          {chuoiNhap.trim().length > 0 && (
            <TouchableOpacity
              style={[
                kieu.nutGui,
                (dangXuLy || dangGhiAm) && { opacity: 0.5 },
              ]}
              onPress={khiGui}
              disabled={dangXuLy || dangGhiAm}
            >
              <IconGui size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
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
    backgroundColor: MAU_SAC.beMat,
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vien,
  },
  khoiTieuDe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bieuTuongAI: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thongTinTieuDe: {
    marginLeft: KHOANG_CACH.trung,
  },
  pillTrangThai: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DO_BO_GOC.tron,
  },
  chamTrangThai: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  chuTrangThai: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },  nutLamMoi: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DO_BO_GOC.vua,
    backgroundColor: MAU_SAC.nen,
  },
  chuNutLamMoi: {
    fontSize: 13,
    color: MAU_SAC.chuPhu,
    fontWeight: '500',
    marginLeft: 5,
  },
  khoiGoiYNhanh: {
    paddingHorizontal: KHOANG_CACH.lon,
    paddingBottom: KHOANG_CACH.trung,
  },
  nhanGoiY: {
    color: MAU_SAC.chuPhu,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: KHOANG_CACH.vua,
  },
  dongGoiY: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipGoiY: {
    marginRight: KHOANG_CACH.vua,
    marginBottom: KHOANG_CACH.vua,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
  },
  chuGoiY: {
    color: MAU_SAC.nhanManhToi,
    fontSize: 12,
    fontWeight: '600',
  },  danhSachTinNhan: {
    padding: KHOANG_CACH.lon,
    paddingBottom: 24,
  },
  hopTinNhan: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: DO_BO_GOC.lon,
    marginBottom: KHOANG_CACH.trung,
  },
  tinNguoiDung: {
    alignSelf: 'flex-end',
    backgroundColor: MAU_SAC.nhanManh,
    borderBottomRightRadius: 4,
    shadowColor: MAU_SAC.nhanManh,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  tinHeThong: {
    alignSelf: 'flex-start',
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
    borderBottomLeftRadius: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeAI: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chuBadgeAI: {
    fontSize: 11,
    fontWeight: '700',
    color: MAU_SAC.nhanManh,
    marginLeft: 4,
  },
  chuTinNhan: {
    fontSize: 15,
    color: MAU_SAC.chuChinh,
    lineHeight: 22,
  },
  chuNguoiDung: {
    color: '#FFFFFF',
  },
  theHanhDongTao: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: DO_BO_GOC.trung,
    padding: KHOANG_CACH.trung,
    marginBottom: KHOANG_CACH.trung,
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  theHanhDongXoa: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: DO_BO_GOC.trung,
    padding: KHOANG_CACH.trung,
    marginBottom: KHOANG_CACH.trung,
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  hangTheHanhDong: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconHanhDongXanh: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconHanhDongDo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tieuDeHanhDong: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  tenGhiChuTao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginTop: 2,
  },
  chuHanhDongXoa: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C1C',
  },
  nutXemNgay: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  chuNutXemNgay: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  khungDangXuLy: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: KHOANG_CACH.lon,
    paddingVertical: 8,
  },
  chuDangXuLy: {
    fontSize: 13,
    color: MAU_SAC.chuPhu,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  bannerGhiAm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  chamDoGhiAm: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  chuBannerGhiAm: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  khungNhap: {
    flexDirection: 'row',
    paddingHorizontal: KHOANG_CACH.trung,
    paddingVertical: KHOANG_CACH.vua + 2,
    backgroundColor: MAU_SAC.beMat,
    borderTopWidth: 1,
    borderTopColor: MAU_SAC.vien,
    alignItems: 'center',
  },
  oNhap: {
    flex: 1,
    backgroundColor: MAU_SAC.nen,
    borderRadius: DO_BO_GOC.tron,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: MAU_SAC.chuChinh,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: MAU_SAC.vien,
  },
  nutMicro: {
    marginLeft: KHOANG_CACH.vua,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientMicro: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutMicroDangNoi: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  khoiMicroDangNoi: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutGui: {
    marginLeft: KHOANG_CACH.vua,
    backgroundColor: MAU_SAC.nhanManh,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MAU_SAC.nhanManh,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
