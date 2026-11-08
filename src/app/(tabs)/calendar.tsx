import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconDongHo, IconThem } from '../../components/Icons';
import { layDanhSach, xoaGhiChu } from '../../storage/noteStorage';
import { DO_BO_GOC, KHOANG_CACH, KIEU_CHU, MAU_SAC } from '../../theme';
import type { GhiChu } from '../../types';

dayjs.locale('vi');

type CheDoLich = 'ngay' | 'tuan' | 'thang';

const THU_TRONG_TUAN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MAU_THE_NHAC = [
  { nen: '#E8F2FF', diem: '#6A9FE8', chu: '#315A91' },
  { nen: '#F8EAF6', diem: '#C27BB6', chu: '#805276' },
  { nen: '#FFF0E0', diem: '#E69B52', chu: '#8D5C2D' },
  { nen: '#EEEAFE', diem: '#8B7BE5', chu: '#574C9A' },
  { nen: '#E8F5EF', diem: '#59A982', chu: '#356D53' },
];

const layKhoaNgay = (ngay: Dayjs) => ngay.format('YYYY-MM-DD');

const batDauTuan = (ngay: Dayjs) =>
  ngay.startOf('day').subtract((ngay.day() + 6) % 7, 'day');

const vietHoaChuDau = (chuoi: string) =>
  chuoi.charAt(0).toLocaleUpperCase('vi-VN') + chuoi.slice(1);

export default function ManHinhLich() {
  const router = useRouter();
  const [danhSachGhiChu, setDanhSachGhiChu] = useState<GhiChu[]>([]);
  const [ngayDangChon, setNgayDangChon] = useState<Dayjs>(dayjs());
  const [cheDo, setCheDo] = useState<CheDoLich>('tuan');

  const taiDuLieu = useCallback(async () => {
    const duLieu = await layDanhSach();
    setDanhSachGhiChu(duLieu);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void taiDuLieu();
    }, [taiDuLieu])
  );

  const danhSachDaHen = useMemo(
    () =>
      danhSachGhiChu
        .filter((ghiChu) => !!ghiChu.thoiGianNhac)
        .sort(
          (a, b) =>
            new Date(a.thoiGianNhac!).getTime() -
            new Date(b.thoiGianNhac!).getTime()
        ),
    [danhSachGhiChu]
  );

  const ghiChuTheoNgay = useMemo(() => {
    const ketQua = new Map<string, GhiChu[]>();
    danhSachDaHen.forEach((ghiChu) => {
      const khoa = layKhoaNgay(dayjs(ghiChu.thoiGianNhac));
      const trongNgay = ketQua.get(khoa) ?? [];
      trongNgay.push(ghiChu);
      ketQua.set(khoa, trongNgay);
    });
    return ketQua;
  }, [danhSachDaHen]);

  const cacNgayTrongTuan = useMemo(() => {
    const dauTuan = batDauTuan(ngayDangChon);
    return Array.from({ length: 7 }, (_, index) => dauTuan.add(index, 'day'));
  }, [ngayDangChon]);

  const cacNgayTrongThang = useMemo(() => {
    const ngayDauThang = ngayDangChon.startOf('month');
    const ngayDauO = batDauTuan(ngayDauThang);
    const soO = Math.ceil(
      ((ngayDauThang.day() === 0 ? 6 : ngayDauThang.day() - 1) +
        ngayDauThang.daysInMonth()) /
        7
    ) * 7;

    return Array.from({ length: soO }, (_, index) => ngayDauO.add(index, 'day'));
  }, [ngayDangChon]);

  const cacNhomNgay = useMemo(() => {
    const cacNgay = cheDo === 'tuan' ? cacNgayTrongTuan : [ngayDangChon];
    return cacNgay
      .map((ngay) => ({
        ngay,
        ghiChu: ghiChuTheoNgay.get(layKhoaNgay(ngay)) ?? [],
      }))
      .filter((nhom) => nhom.ghiChu.length > 0);
  }, [cheDo, cacNgayTrongTuan, ghiChuTheoNgay, ngayDangChon]);

  const tongNhacTrongKhoang = cacNhomNgay.reduce(
    (tong, nhom) => tong + nhom.ghiChu.length,
    0
  );

  const nhanNgay = useMemo(() => {
    if (cheDo === 'ngay') {
      return vietHoaChuDau(ngayDangChon.format('dddd, D MMMM'));
    }
    if (cheDo === 'thang') {
      return vietHoaChuDau(ngayDangChon.format('MMMM YYYY'));
    }

    const dauTuan = cacNgayTrongTuan[0];
    const cuoiTuan = cacNgayTrongTuan[6];
    return dauTuan.month() === cuoiTuan.month()
      ? dauTuan.format('D') + ' – ' + cuoiTuan.format('D MMMM')
      : dauTuan.format('D MMM') + ' – ' + cuoiTuan.format('D MMM');
  }, [cacNgayTrongTuan, cheDo, ngayDangChon]);

  const chuyenKhoang = (buoc: number) => {
    setNgayDangChon((ngay) => {
      if (cheDo === 'ngay') return ngay.add(buoc, 'day');
      if (cheDo === 'thang') return ngay.add(buoc, 'month');
      return ngay.add(buoc * 7, 'day');
    });
  };

  const veHomNay = () => setNgayDangChon(dayjs());

  const xacNhanXoa = (ghiChu: GhiChu) => {
    Alert.alert('Xóa nhắc việc?', 'Bạn có muốn xóa “' + ghiChu.tieuDe + '” không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await xoaGhiChu(ghiChu.id);
          await taiDuLieu();
        },
      },
    ]);
  };

  const moGhiChu = (ghiChu: GhiChu) =>
    router.push({ pathname: '/add-note', params: { id: ghiChu.id } });

  const renderTheNhac = (ghiChu: GhiChu, index: number) => {
    const khoaMau = Array.from(ghiChu.id).reduce((tong, kyTu) => tong + kyTu.charCodeAt(0), 0);
    const mau = MAU_THE_NHAC[khoaMau % MAU_THE_NHAC.length];
    const gioNhac = dayjs(ghiChu.thoiGianNhac).format('HH:mm');

    return (
      <TouchableOpacity
        key={ghiChu.id}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={ghiChu.tieuDe + ', ' + gioNhac}
        onPress={() => moGhiChu(ghiChu)}
        onLongPress={() => xacNhanXoa(ghiChu)}
        style={[kieu.theNhac, { backgroundColor: mau.nen }]}
      >
        <View style={[kieu.vachMau, { backgroundColor: mau.diem }]} />
        <View style={kieu.noiDungThe}>
          <View style={kieu.hangThongTinThe}>
            <Text style={[kieu.tieuDeNhac, { color: mau.chu }]} numberOfLines={1}>
              {ghiChu.tieuDe || 'Nhắc việc'}
            </Text>
            <View style={kieu.nhanGio}>
              <IconDongHo size={13} color={mau.chu} />
              <Text style={[kieu.gioNhac, { color: mau.chu }]}>{gioNhac}</Text>
            </View>
          </View>
          {ghiChu.noiDung ? (
            <Text style={kieu.moTaNhac} numberOfLines={2}>
              {ghiChu.noiDung}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNhomNgay = (ngay: Dayjs, ghiChu: GhiChu[]) => {
    const laHomNay = ngay.isSame(dayjs(), 'day');
    const tenThu = laHomNay ? 'Hôm nay' : vietHoaChuDau(ngay.format('dddd'));

    return (
      <View key={layKhoaNgay(ngay)} style={kieu.nhomNgay}>
        <View style={kieu.dauNhomNgay}>
          <View style={kieu.oNgayNhom}>
            <Text style={kieu.soNgayNhom}>{ngay.format('DD')}</Text>
            <Text style={kieu.thuNhom}>{ngay.format('ddd').toUpperCase()}</Text>
          </View>
          <View style={kieu.thongTinNhom}>
            <Text style={kieu.tenNhomNgay}>{tenThu}</Text>
            <Text style={kieu.ngayNhom}>{ngay.format('D MMMM')}</Text>
          </View>
          <Text style={kieu.soLuongNhom}>
            {ghiChu.length} nhắc việc
          </Text>
        </View>
        {ghiChu.map((muc, index) => renderTheNhac(muc, index))}
      </View>
    );
  };

  const renderLichThang = () => (
    <View style={kieu.khoiLichThang}>
      <View style={kieu.hangThu}>
        {THU_TRONG_TUAN.map((thu) => (
          <Text key={thu} style={kieu.nhanThuThang}>
            {thu}
          </Text>
        ))}
      </View>
      <View style={kieu.luoiThang}>
        {cacNgayTrongThang.map((ngay) => {
          const laThangDangChon = ngay.month() === ngayDangChon.month();
          const laNgayChon = ngay.isSame(ngayDangChon, 'day');
          const laHomNay = ngay.isSame(dayjs(), 'day');
          const coNhac =
            (ghiChuTheoNgay.get(layKhoaNgay(ngay))?.length ?? 0) > 0;

          return (
            <TouchableOpacity
              key={layKhoaNgay(ngay)}
              activeOpacity={0.72}
              onPress={() => setNgayDangChon(ngay)}
              style={kieu.oNgayThang}
              accessibilityRole="button"
              accessibilityLabel={ngay.format('D MMMM YYYY')}
            >
              <View
                style={[
                  kieu.vienNgayThang,
                  laNgayChon && kieu.vienNgayDangChon,
                  laHomNay && !laNgayChon && kieu.vienHomNayThang,
                ]}
              >
                <Text
                  style={[
                    kieu.soNgayThang,
                    !laThangDangChon && kieu.soNgayNgoaiThang,
                    laNgayChon && kieu.soNgayDangChon,
                    laHomNay && !laNgayChon && kieu.soHomNay,
                  ]}
                >
                  {ngay.date()}
                </Text>
              </View>
              <View
                style={[
                  kieu.chamLichThang,
                  coNhac && kieu.chamLichCoNhac,
                  laNgayChon && coNhac && kieu.chamLichNgayDangChon,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={kieu.khungChua} edges={['top', 'left', 'right']}>
      <ScrollView
        style={kieu.cuon}
        contentContainerStyle={kieu.noiDungCuon}
        showsVerticalScrollIndicator={false}
      >
        <View style={kieu.thanhTieuDe}>
          <View>
            <Text style={kieu.nhanNho}>KẾ HOẠCH CỦA BẠN</Text>
            <Text style={KIEU_CHU.tieuDeLon}>Lịch biểu</Text>
          </View>
          <TouchableOpacity
            style={kieu.nutHomNay}
            onPress={veHomNay}
            activeOpacity={0.75}
          >
            <Text style={kieu.chuNutHomNay}>Hôm nay</Text>
          </TouchableOpacity>
        </View>

        <View style={kieu.boChonCheDo}>
          {([
            ['ngay', 'Ngày'],
            ['tuan', 'Tuần'],
            ['thang', 'Tháng'],
          ] as [CheDoLich, string][]).map(([giaTri, nhan]) => {
            const dangChon = cheDo === giaTri;
            return (
              <TouchableOpacity
                key={giaTri}
                onPress={() => setCheDo(giaTri)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityState={{ selected: dangChon }}
                style={[kieu.nutCheDo, dangChon && kieu.nutCheDoDangChon]}
              >
                <Text
                  style={[
                    kieu.chuCheDo,
                    dangChon && kieu.chuCheDoDangChon,
                  ]}
                >
                  {nhan}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={kieu.thanhKhoangNgay}>
          <TouchableOpacity
            style={kieu.nutMuiTen}
            onPress={() => chuyenKhoang(-1)}
            accessibilityRole="button"
            accessibilityLabel="Khoảng thời gian trước"
          >
            <Text style={kieu.chuMuiTen}>‹</Text>
          </TouchableOpacity>
          <Text style={kieu.nhanKhoangNgay}>{nhanNgay}</Text>
          <TouchableOpacity
            style={kieu.nutMuiTen}
            onPress={() => chuyenKhoang(1)}
            accessibilityRole="button"
            accessibilityLabel="Khoảng thời gian tiếp theo"
          >
            <Text style={kieu.chuMuiTen}>›</Text>
          </TouchableOpacity>
        </View>

        {cheDo === 'thang' ? (
          renderLichThang()
        ) : (
          <View style={kieu.daiNgay}>
            {cacNgayTrongTuan.map((ngay, index) => {
              const laNgayChon = ngay.isSame(ngayDangChon, 'day');
              const laHomNay = ngay.isSame(dayjs(), 'day');
              const coNhac =
                (ghiChuTheoNgay.get(layKhoaNgay(ngay))?.length ?? 0) > 0;

              return (
                <TouchableOpacity
                  key={layKhoaNgay(ngay)}
                  onPress={() => setNgayDangChon(ngay)}
                  activeOpacity={0.76}
                  accessibilityRole="button"
                  accessibilityState={{ selected: laNgayChon }}
                  accessibilityLabel={ngay.format('dddd, D MMMM YYYY')}
                  style={kieu.oNgayTuan}
                >
                  <View
                    style={[
                      kieu.vienNgayTuan,
                      laNgayChon && kieu.vienNgayTuanDangChon,
                      laHomNay && !laNgayChon && kieu.vienHomNayTuan,
                    ]}
                  >
                    <Text
                      style={[
                        kieu.thuTrongDai,
                        laNgayChon && kieu.chuNgayTuanDangChon,
                        laHomNay && !laNgayChon && kieu.chuHomNay,
                      ]}
                    >
                      {THU_TRONG_TUAN[index]}
                    </Text>
                    <Text
                      style={[
                        kieu.soTrongDai,
                        laNgayChon && kieu.chuNgayTuanDangChon,
                        laHomNay && !laNgayChon && kieu.chuHomNay,
                      ]}
                    >
                      {ngay.date()}
                    </Text>
                  </View>
                  <View
                    style={[
                      kieu.chamNgayTuan,
                      coNhac && kieu.chamNgayCoNhac,
                      laNgayChon && coNhac && kieu.chamNgayDangChon,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={kieu.tieuDeLichHen}>
          <View>
            <Text style={kieu.tieuDeDanhSach}>
              {cheDo === 'tuan' ? 'Lịch hẹn trong tuần' : 'Lịch hẹn'}
            </Text>
            <Text style={kieu.phuDeDanhSach}>
              {tongNhacTrongKhoang} nhắc việc
            </Text>
          </View>
          <View style={kieu.chamTrangThai}>
            <View style={kieu.chamTrangThaiTrong} />
          </View>
        </View>

        {cacNhomNgay.length === 0 ? (
          <View style={kieu.khungTrong}>
            <View style={kieu.bieuTuongTrong}>
              <IconDongHo size={24} color={MAU_SAC.nhanManh} />
            </View>
            <Text style={kieu.tieuDeTrong}>
              {cheDo === 'tuan' ? 'Tuần này chưa có lịch nhắc' : 'Ngày này chưa có lịch nhắc'}
            </Text>
            <Text style={kieu.phuDeTrong}>
              Tạo nhắc việc mới để lịch của bạn luôn được cập nhật.
            </Text>
          </View>
        ) : (
          <View style={kieu.danhSachNhom}>
            {cacNhomNgay.map((nhom) => renderNhomNgay(nhom.ngay, nhom.ghiChu))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={kieu.nutThemNoi}
        onPress={() => router.push('/add-note')}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Tạo nhắc việc mới"
      >
        <IconThem size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const kieu = StyleSheet.create({
  khungChua: {
    flex: 1,
    backgroundColor: MAU_SAC.nen,
  },
  cuon: {
    flex: 1,
  },
  noiDungCuon: {
    paddingBottom: 164,
  },
  thanhTieuDe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: KHOANG_CACH.lon,
    paddingTop: KHOANG_CACH.trung,
    paddingBottom: KHOANG_CACH.trung,
  },
  nhanNho: {
    color: MAU_SAC.nhanManh,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  nutHomNay: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: MAU_SAC.nhanManhNhat,
  },
  chuNutHomNay: {
    color: MAU_SAC.nhanManh,
    fontSize: 12,
    fontWeight: '700',
  },
  boChonCheDo: {
    flexDirection: 'row',
    marginHorizontal: KHOANG_CACH.lon,
    marginTop: KHOANG_CACH.vua,
    padding: 4,
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: '#EFEEF4',
  },
  nutCheDo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: DO_BO_GOC.tron,
  },
  nutCheDoDangChon: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  chuCheDo: {
    color: MAU_SAC.chuPhu,
    fontSize: 13,
    fontWeight: '600',
  },
  chuCheDoDangChon: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  thanhKhoangNgay: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: KHOANG_CACH.lon,
    marginTop: KHOANG_CACH.trung,
  },
  nutMuiTen: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vienNhe,
  },
  chuMuiTen: {
    color: MAU_SAC.chuChinh,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '500',
  },
  nhanKhoangNgay: {
    flex: 1,
    textAlign: 'center',
    color: MAU_SAC.chuChinh,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  daiNgay: {
    flexDirection: 'row',
    paddingHorizontal: KHOANG_CACH.trung,
    marginTop: KHOANG_CACH.vua,
    marginBottom: KHOANG_CACH.trung,
  },
  oNgayTuan: {
    flex: 1,
    alignItems: 'center',
  },
  vienNgayTuan: {
    width: 40,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  vienNgayTuanDangChon: {
    backgroundColor: '#15151B',
    borderColor: '#15151B',
  },
  vienHomNayTuan: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  thuTrongDai: {
    color: MAU_SAC.chuMo,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
  },
  soTrongDai: {
    color: MAU_SAC.chuChinh,
    fontSize: 15,
    fontWeight: '700',
  },
  chuNgayTuanDangChon: {
    color: '#FFFFFF',
  },
  chuHomNay: {
    color: MAU_SAC.nhanManh,
  },
  chamNgayTuan: {
    width: 4,
    height: 4,
    marginTop: 5,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  chamNgayCoNhac: {
    backgroundColor: MAU_SAC.nhanManh,
  },
  chamNgayDangChon: {
    backgroundColor: '#FFFFFF',
  },
  khoiLichThang: {
    marginHorizontal: KHOANG_CACH.lon,
    marginTop: KHOANG_CACH.vua,
    marginBottom: KHOANG_CACH.trung,
    paddingVertical: KHOANG_CACH.vua,
    paddingHorizontal: KHOANG_CACH.vua,
    borderRadius: DO_BO_GOC.lon,
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vienNhe,
  },
  hangThu: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  nhanThuThang: {
    width: '14.2857%',
    textAlign: 'center',
    color: MAU_SAC.chuMo,
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 8,
  },
  luoiThang: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  oNgayThang: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vienNgayThang: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DO_BO_GOC.tron,
  },
  vienNgayDangChon: {
    backgroundColor: '#15151B',
  },
  vienHomNayThang: {
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  soNgayThang: {
    color: MAU_SAC.chuChinh,
    fontSize: 13,
    fontWeight: '600',
  },
  soNgayNgoaiThang: {
    color: '#CBD0DA',
  },
  soNgayDangChon: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  soHomNay: {
    color: MAU_SAC.nhanManh,
  },
  chamLichThang: {
    width: 4,
    height: 4,
    marginTop: -2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  chamLichCoNhac: {
    backgroundColor: MAU_SAC.nhanManh,
  },
  chamLichNgayDangChon: {
    backgroundColor: '#FFFFFF',
  },
  tieuDeLichHen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: KHOANG_CACH.lon,
    paddingBottom: KHOANG_CACH.vua,
    borderBottomWidth: 1,
    borderBottomColor: MAU_SAC.vienNhe,
  },
  tieuDeDanhSach: {
    color: MAU_SAC.chuChinh,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  phuDeDanhSach: {
    color: MAU_SAC.chuMo,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  chamTrangThai: {
    width: 30,
    height: 30,
    borderRadius: DO_BO_GOC.tron,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MAU_SAC.nhanManhNhat,
  },
  chamTrangThaiTrong: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MAU_SAC.nhanManh,
  },
  danhSachNhom: {
    paddingHorizontal: KHOANG_CACH.lon,
    paddingTop: KHOANG_CACH.trung,
  },
  nhomNgay: {
    marginBottom: KHOANG_CACH.vua,
  },
  dauNhomNgay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: KHOANG_CACH.vua,
  },
  oNgayNhom: {
    width: 38,
    height: 42,
    borderRadius: DO_BO_GOC.vua,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vienNhe,
  },
  soNgayNhom: {
    color: MAU_SAC.chuChinh,
    fontSize: 14,
    fontWeight: '700',
  },
  thuNhom: {
    color: MAU_SAC.chuMo,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
  thongTinNhom: {
    flex: 1,
    marginLeft: KHOANG_CACH.vua,
  },
  tenNhomNgay: {
    color: MAU_SAC.chuChinh,
    fontSize: 13,
    fontWeight: '700',
  },
  ngayNhom: {
    color: MAU_SAC.chuMo,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  soLuongNhom: {
    color: MAU_SAC.chuPhu,
    fontSize: 10,
    fontWeight: '600',
  },
  theNhac: {
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: KHOANG_CACH.vua,
    borderRadius: DO_BO_GOC.trung,
  },
  vachMau: {
    width: 4,
  },
  noiDungThe: {
    flex: 1,
    paddingHorizontal: KHOANG_CACH.trung,
    paddingVertical: KHOANG_CACH.trung,
  },
  hangThongTinThe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tieuDeNhac: {
    flex: 1,
    marginRight: KHOANG_CACH.vua,
    fontSize: 14,
    fontWeight: '700',
  },
  nhanGio: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gioNhac: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  moTaNhac: {
    color: MAU_SAC.chuPhu,
    fontSize: 12,
    lineHeight: 17,
    marginTop: KHOANG_CACH.vua,
  },
  khungTrong: {
    alignItems: 'center',
    marginHorizontal: KHOANG_CACH.lon,
    marginTop: KHOANG_CACH.lon,
    paddingHorizontal: KHOANG_CACH.lon,
    paddingVertical: KHOANG_CACH.ratLon,
    borderRadius: DO_BO_GOC.lon,
    backgroundColor: MAU_SAC.beMat,
    borderWidth: 1,
    borderColor: MAU_SAC.vienNhe,
  },
  bieuTuongTrong: {
    width: 48,
    height: 48,
    borderRadius: DO_BO_GOC.tron,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MAU_SAC.nhanManhNhat,
    marginBottom: KHOANG_CACH.trung,
  },
  tieuDeTrong: {
    color: MAU_SAC.chuChinh,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  phuDeTrong: {
    color: MAU_SAC.chuPhu,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: KHOANG_CACH.vua,
  },
  nutThemNoi: {
    position: 'absolute',
    right: KHOANG_CACH.lon,
    bottom: 92,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DO_BO_GOC.tron,
    backgroundColor: MAU_SAC.nhanManh,
    shadowColor: MAU_SAC.nhanManhToi,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
});
