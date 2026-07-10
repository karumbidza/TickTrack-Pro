import { View, Text, Pressable, Image, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, ImagePlus, X } from 'lucide-react-native'
import { colors, font, radius } from '@/lib/theme'
import { Mono } from '@/components/ui'

/**
 * Multi-photo picker (camera + library). Controlled: parent owns the asset list.
 */
export function PhotoPicker({
  assets,
  onChange,
  max = 5,
}: {
  assets: ImagePicker.ImagePickerAsset[]
  onChange: (next: ImagePicker.ImagePickerAsset[]) => void
  max?: number
}) {
  const pick = async (fromCamera: boolean) => {
    if (assets.length >= max) {
      Alert.alert('Limit reached', `You can attach up to ${max} photos.`)
      return
    }
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', `Please allow ${fromCamera ? 'camera' : 'photo'} access in Settings.`)
      return
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: max - assets.length })
    if (!result.canceled) {
      onChange([...assets, ...result.assets].slice(0, max))
    }
  }

  const remove = (uri: string) => onChange(assets.filter((a) => a.uri !== uri))

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {assets.map((a) => (
          <View key={a.uri} style={{ width: 72, height: 72 }}>
            <Image source={{ uri: a.uri }} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.hover }} />
            <Pressable
              onPress={() => remove(a.uri)}
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' }}
            >
              <X color={colors.white} size={13} strokeWidth={2.2} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PickButton icon={<Camera color={colors.textTertiary} size={16} strokeWidth={1.8} />} label="Camera" onPress={() => pick(true)} />
        <PickButton icon={<ImagePlus color={colors.textTertiary} size={16} strokeWidth={1.8} />} label="Library" onPress={() => pick(false)} />
      </View>
    </View>
  )
}

function PickButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
    >
      {icon}
      <Text style={{ fontFamily: font.sans, fontSize: 13, color: colors.textTertiary }}>{label}</Text>
    </Pressable>
  )
}
