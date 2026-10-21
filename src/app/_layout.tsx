import { MAU_SAC } from '@/theme'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function LayoutGoc() {
  return (
    <>
      <StatusBar style='dark' />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: MAU_SAC.nen },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="add-note"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="chat"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  )
}