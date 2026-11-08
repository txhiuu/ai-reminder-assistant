import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconAI, IconGhiChu, IconLich } from '../../components/Icons';
import { MAU_SAC } from '../../theme';

function NutTrungTamAI({ onPress }: any) {
  const khiNhan = (e: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onPress?.(e);
  };

  return (
    <View style={kieu.khungChuaNut}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={khiNhan}
        style={kieu.nutTrungTamNgoai}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={kieu.nutTronAI}
        >
          <IconAI size={26} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 14 : 8);
  const tabHeight = 58 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true, 
        tabBarActiveTintColor: MAU_SAC.nhanManh,
        tabBarInactiveTintColor: MAU_SAC.chuMo,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: MAU_SAC.vien,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ghi chú',
          tabBarIcon: ({ color, focused }) => (
            <IconGhiChu size={22} color={focused ? MAU_SAC.nhanManh : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Trợ lý AI',
          tabBarButton: (props) => <NutTrungTamAI {...props} />,
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Lịch biểu',
          tabBarIcon: ({ color, focused }) => (
            <IconLich size={22} color={focused ? MAU_SAC.nhanManh : color} />
          ),
        }}
      />
    </Tabs>
  );
}

const kieu = StyleSheet.create({
  khungChuaNut: {
    position: 'relative',
    top: -20,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutTrungTamNgoai: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  nutTronAI: {
    flex: 1,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
