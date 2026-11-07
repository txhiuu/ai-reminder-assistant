// src/app/chat.tsx
import { AudioStudioModule, useAudioRecorder } from '@siteed/audio-studio';
import base64 from 'base64-js';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { socketService } from '../services/liveSocketService';
import { layLichSuChat, luuLichSuChat, xoaLichSuChat } from '../storage/chatStorage';
import { layDanhSach, luuGhiChu, xoaGhiChu } from '../storage/noteStorage';
import { KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../theme';
import { TinNhan } from '../types';
import { taoId } from '../utils/generateId';

function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const pcmBuffer = base64.toByteArray(pcmBase64);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmBuffer.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
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

export default function ManHinhChat() {
  const router = useRouter();
  const [tinNhan, setTinNhan] = useState<TinNhan[]>([]);
  const [chuoiNhap, setChuoiNhap] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [dangGhiAm, setDangGhiAm] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const player = useAudioPlayer(); 
  const audioRecorder = useAudioRecorder();

  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const dangGopText = useRef(false);
  const isPlayingAudioRef = useRef(false);

  useEffect(() => {
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
        await FileSystem.writeAsStringAsync(fileUri, wavBase64, { encoding: FileSystem.EncodingType.Base64 });
        
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
      setTinNhan(cu => {
        const lastMsg = cu[cu.length - 1];
        
        if (dangGopText.current && lastMsg && lastMsg.vaiTro === 'heThong' && (Date.now() - lastMsg.thoiGian < 5000)) {
          const updatedMsg = { ...lastMsg, noiDung: lastMsg.noiDung + " " + text, thoiGian: Date.now() };
          return [...cu.slice(0, -1), updatedMsg];
        } else {
          dangGopText.current = true;
          return [...cu, { 
            id: taoId(),
            vaiTro: 'heThong', 
            noiDung: text, 
            thoiGian: Date.now() 
          }];
        }
      });
    });

    socketService.onFunctionCall(async (name, args) => {
      let resultMessage = "Thành công";
      setDangXuLy(true);
      dangGopText.current = false;

      try {
        if (name === 'tao_ghi_chu') {
          await luuGhiChu({
            id: taoId(),
            tieuDe: args.tieuDe,
            noiDung: args.noiDung || '',
            thoiGianNhac: args.thoiGianNhac || undefined,
            ngayTao: Date.now(),
            ngayCapNhat: Date.now(),
          });
          setTinNhan(cu => [...cu, { id: taoId(), vaiTro: 'heThong', noiDung: `✅ Đã tạo ghi chú: ${args.tieuDe}`, thoiGian: Date.now() }]);
        } 
        else if (name === 'xoa_ghi_chu') {
          const tatCaGhiChu = await layDanhSach();
          const tuKhoa = args.tuKhoaXoa.toLowerCase();
          const ghiChuCanXoa = tatCaGhiChu.filter((n) => n.tieuDe.toLowerCase().includes(tuKhoa) || n.noiDung.toLowerCase().includes(tuKhoa));
          
          if (ghiChuCanXoa.length > 0) {
            for (const ghiChu of ghiChuCanXoa) await xoaGhiChu(ghiChu.id);
            setTinNhan(cu => [...cu, { id: taoId(), vaiTro: 'heThong', noiDung: `🗑️ Đã xóa ${ghiChuCanXoa.length} ghi chú.`, thoiGian: Date.now() }]);
            resultMessage = "Đã xóa thành công";
          } else {
            setTinNhan(cu => [...cu, { id: taoId(), vaiTro: 'heThong', noiDung: `🔍 Không tìm thấy ghi chú.`, thoiGian: Date.now() }]);
            resultMessage = "Không tìm thấy ghi chú để xóa";
          }
        } 
        else if (name === 'xem_ghi_chu') {
          router.replace({ pathname: '/', params: { search: args.tuKhoaXem } });
          resultMessage = "Đã mở màn hình tìm kiếm";
        }
      } catch (e) { 
        resultMessage = "Thất bại"; 
      }
      
      socketService.sendFunctionResponse(name, { success: true, message: resultMessage });
      setDangXuLy(false);
    });

    return () => {
      // socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const khoiTaoChat = async () => {
      const lichSu = await layLichSuChat();
      if (lichSu.length > 0) {
        setTinNhan(lichSu);
      } else {
        setTinNhan([{ 
          id: taoId(),
          vaiTro: 'heThong', 
          noiDung: 'Chào bạn! Tôi là trợ lý AI. Bạn có thể nhấn giữ nút Micro để nói hoặc nhắn tin.',
          thoiGian: Date.now()
        }]);
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
    Alert.alert('Làm mới', 'Bạn có chắc muốn xóa toàn bộ lịch sử chat?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        await xoaLichSuChat();
        setTinNhan([{ id: taoId(), vaiTro: 'heThong', noiDung: 'Đã làm mới cuộc trò chuyện.', thoiGian: Date.now() }]);
      }}
    ]);
  };

  const khiGui = async () => {
    if (chuoiNhap.trim() === '' || dangXuLy) return;
    
    const noiDungNhap = chuoiNhap.trim();
    setChuoiNhap('');
    setDangXuLy(true);
    dangGopText.current = false;
    
    setTinNhan(cu => [...cu, { id: taoId(), vaiTro: 'nguoiDung', noiDung: noiDungNhap, thoiGian: Date.now() }]);
    
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
        }
      });
    } catch (error) {
      console.log("Lỗi khi bắt đầu ghi âm:", error);
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
      console.log("Lỗi khi dừng ghi âm:", error);
    } finally {
      setTimeout(() => {
        isStoppingRef.current = false;
        setDangXuLy(false);
      }, 300);
    }
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
            editable={!dangXuLy && !dangGhiAm}
            multiline
          />
          
          <TouchableOpacity
            style={[kieu.nutMicro, dangGhiAm && { backgroundColor: MAU_SAC.nguyHiem }]}
            onPressIn={batDauGhiAm} 
            onPressOut={dungGhiAm}   
            disabled={dangXuLy}
          >
            <Text style={{ fontSize: 20 }}>{dangGhiAm ? '🔴' : '🎙️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[kieu.nutGui, (dangXuLy || dangGhiAm) && { opacity: 0.5 }]}
            onPress={khiGui}
            disabled={dangXuLy || dangGhiAm}
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
  nutLamMoi: { fontSize: 16, color: MAU_SAC.nguyHiem, fontWeight: '600' },
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
  nutMicro: {
    marginLeft: KHOANG_CACH.vua,
    backgroundColor: '#E5E5EA', 
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutGui: { marginLeft: KHOANG_CACH.vua, backgroundColor: MAU_SAC.nhanManh, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  chuNutGui: { color: '#FFFFFF', fontWeight: '600' },
});