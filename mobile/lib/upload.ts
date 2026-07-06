import type { ImagePickerAsset } from 'expo-image-picker'

/**
 * Convert an expo-image-picker asset into the `{ uri, name, type }` shape that
 * React Native's FormData expects for a file part. Append under the field name
 * the server reads (e.g. 'files' for ticket attachments).
 */
export function assetToFilePart(asset: ImagePickerAsset) {
  const name = asset.fileName || asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`
  const type = asset.mimeType || 'image/jpeg'
  return { uri: asset.uri, name, type } as any
}
