import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import type { ImagePickerAsset } from 'expo-image-picker'
import { useApi } from '@/lib/api'
import { colors, font, radius } from '@/lib/theme'
import { Button, Mono } from '@/components/ui'
import { Dropdown, type Option } from '@/components/select'
import { PhotoPicker } from '@/components/photo-picker'
import { assetToFilePart } from '@/lib/upload'

const TYPES: Option[] = ['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER'].map((v) => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }))
const PRIORITIES: Option[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }))
const DEPARTMENTS: Option[] = ['IT', 'SALES', 'RETAIL', 'MAINTENANCE', 'PROJECTS', 'FACILITIES', 'OPERATIONS'].map((v) => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }))

interface AssetOpt { id: string; name: string; assetNumber?: string; location?: string | null; categoryId?: string | null }
interface CatOpt { id: string; name: string }

export default function NewTicket() {
  const api = useApi()
  const router = useRouter()
  const { user } = useUser()
  const params = useLocalSearchParams<{ assetId?: string; categoryId?: string }>()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('REPAIR')
  const [priority, setPriority] = useState('MEDIUM')
  const [department, setDepartment] = useState('MAINTENANCE')
  const [assetId, setAssetId] = useState<string | null>(params.assetId ?? null)
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null)
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([])
  const [saving, setSaving] = useState(false)

  const [assets, setAssets] = useState<AssetOpt[]>([])
  const [categories, setCategories] = useState<CatOpt[]>([])

  // Reporter defaults to the signed-in user; toggle reveals editable fields.
  const [onBehalf, setOnBehalf] = useState(false)
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')

  useEffect(() => {
    api.get<any>('/api/assets').then((d) => setAssets(d.assets || [])).catch(() => {})
    api.get<any>('/api/asset-categories').then((d) => setCategories(d.categories || [])).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A leading "None" option (value '') lets the user clear these optional fields.
  const assetOptions: Option[] = useMemo(
    () => [
      { label: 'None', value: '' },
      ...assets.map((a) => ({ label: `${a.assetNumber ? a.assetNumber + ' — ' : ''}${a.name}`, value: a.id, hint: a.location || undefined })),
    ],
    [assets],
  )
  const categoryOptions: Option[] = useMemo(
    () => [{ label: 'None', value: '' }, ...categories.map((c) => ({ label: c.name, value: c.id }))],
    [categories],
  )

  const onPickAsset = (id: string) => {
    if (!id) { setAssetId(null); return } // "None" clears the asset
    setAssetId(id)
    // Auto-fill category from the asset, but never clobber a category the user already chose.
    const a = assets.find((x) => x.id === id)
    if (a?.categoryId && !categoryId) setCategoryId(a.categoryId)
  }

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Please add a title and description.')
      return
    }
    if (onBehalf && !reporterName.trim()) {
      Alert.alert('Reporter required', "Please enter the reporter's name, or turn off “Someone else reported this”.")
      return
    }
    setSaving(true)
    try {
      const name = onBehalf ? reporterName.trim() : (user?.fullName || '')
      const contact = onBehalf ? reporterContact.trim() : (user?.primaryEmailAddress?.emailAddress || '')
      const form = new FormData()
      form.append('title', title.trim())
      form.append('description', description.trim())
      form.append('type', type)
      form.append('priority', priority)
      form.append('department', department)
      if (assetId) form.append('assetId', assetId)
      if (categoryId) form.append('categoryId', categoryId)
      if (name) form.append('reporterName', name)
      if (contact) form.append('reporterContact', contact)
      photos.forEach((p) => form.append('files', assetToFilePart(p)))
      await api.post('/api/tickets', form)
      router.back()
    } catch (e: any) {
      Alert.alert('Could not create ticket', e?.message ?? 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.surface,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.sans, fontSize: 15, color: colors.textPrimary,
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Field label="TITLE">
        <TextInput placeholder="Brief summary" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} style={inputStyle} />
      </Field>

      <Field label="DESCRIPTION">
        <TextInput
          placeholder="What's the problem?" placeholderTextColor={colors.textMuted}
          value={description} onChangeText={setDescription} multiline
          style={[inputStyle, { height: 110, textAlignVertical: 'top' }]}
        />
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="TYPE"><Dropdown label="Type" value={type} options={TYPES} onChange={setType} /></Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="PRIORITY"><Dropdown label="Priority" value={priority} options={PRIORITIES} onChange={setPriority} /></Field>
        </View>
      </View>

      <Field label="DEPARTMENT">
        <Dropdown label="Department" value={department} options={DEPARTMENTS} onChange={setDepartment} />
      </Field>

      <Field label="RELATED ASSET · OPTIONAL">
        <Dropdown label="Related asset" value={assetId} options={assetOptions} onChange={onPickAsset} placeholder="None selected" searchable />
      </Field>

      <Field label="CATEGORY · OPTIONAL">
        <Dropdown label="Category" value={categoryId} options={categoryOptions} onChange={(v) => setCategoryId(v || null)} placeholder="Select a category" searchable />
      </Field>

      <Field label="PHOTOS">
        <PhotoPicker assets={photos} onChange={setPhotos} />
      </Field>

      <Pressable onPress={() => setOnBehalf((v) => !v)} style={{ paddingVertical: 4 }}>
        <Text style={{ fontFamily: font.sansMedium, fontSize: 13, color: colors.accent }}>
          {onBehalf ? '✓ Someone else reported this' : 'Someone else reported this?'}
        </Text>
      </Pressable>
      {onBehalf && (
        <View style={{ gap: 12 }}>
          <Field label="REPORTER NAME">
            <TextInput placeholder="Full name" placeholderTextColor={colors.textMuted} value={reporterName} onChangeText={setReporterName} style={inputStyle} />
          </Field>
          <Field label="CONTACT">
            <TextInput placeholder="Phone or email" placeholderTextColor={colors.textMuted} autoCapitalize="none" value={reporterContact} onChangeText={setReporterContact} style={inputStyle} />
          </Field>
        </View>
      )}

      <Button label="Create ticket" onPress={submit} loading={saving} />
    </ScrollView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Mono size={10.5}>{label}</Mono>
      {children}
    </View>
  )
}
