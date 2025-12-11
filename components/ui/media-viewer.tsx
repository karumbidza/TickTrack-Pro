'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Music,
  ExternalLink
} from 'lucide-react'

export interface MediaFile {
  id?: string
  url: string
  filename?: string
  originalName?: string
  mimeType?: string
  name?: string
}

interface MediaViewerProps {
  files: MediaFile[] | string[]
  title?: string
  gridCols?: 2 | 3 | 4
  thumbnailSize?: 'sm' | 'md' | 'lg'
  showDownload?: boolean
  emptyMessage?: string
}

interface MediaThumbnailProps {
  file: MediaFile
  onClick: () => void
  onDownload: () => void
  showDownload?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface LightboxProps {
  files: MediaFile[]
  currentIndex: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onDownload: () => void
}

// Helper to normalize file data
function normalizeFile(file: MediaFile | string): MediaFile {
  if (typeof file === 'string') {
    const filename = file.split('/').pop() || file
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    let mimeType = 'application/octet-stream'
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`
    } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
      mimeType = `video/${extension}`
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
      mimeType = `audio/${extension}`
    } else if (extension === 'pdf') {
      mimeType = 'application/pdf'
    }
    
    return {
      url: file,
      filename,
      originalName: filename,
      mimeType
    }
  }
  return file
}

// Get display name
function getDisplayName(file: MediaFile): string {
  return file.originalName || file.filename || file.name || 'File'
}

// Get file type info
function getFileTypeInfo(file: MediaFile): { type: 'image' | 'video' | 'audio' | 'pdf' | 'file', icon: React.ElementType, color: string } {
  const mimeType = file.mimeType || ''
  
  if (mimeType.startsWith('image/')) {
    return { type: 'image', icon: ImageIcon, color: 'text-green-600' }
  }
  if (mimeType.startsWith('video/')) {
    return { type: 'video', icon: Video, color: 'text-purple-600' }
  }
  if (mimeType.startsWith('audio/')) {
    return { type: 'audio', icon: Music, color: 'text-orange-600' }
  }
  if (mimeType === 'application/pdf') {
    return { type: 'pdf', icon: FileText, color: 'text-red-600' }
  }
  return { type: 'file', icon: File, color: 'text-blue-600' }
}

// Download handler
async function handleDownload(file: MediaFile) {
  try {
    const response = await fetch(file.url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = getDisplayName(file)
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch {
    // Fallback: open in new tab
    window.open(file.url, '_blank')
  }
}

// Lightbox Component for full-screen viewing
function Lightbox({ files, currentIndex, onClose, onPrevious, onNext, onDownload }: LightboxProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const currentFile = files[currentIndex]
  const { type } = getFileTypeInfo(currentFile)
  const displayName = getDisplayName(currentFile)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium truncate max-w-[300px]">{displayName}</span>
            <span className="text-xs text-gray-500">
              {currentIndex + 1} of {files.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {type === 'image' && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRotate} title="Rotate">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(currentFile.url, '_blank')} title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden" style={{ height: 'calc(95vh - 60px)' }}>
          {/* Navigation Arrows */}
          {files.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={onPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={onNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Media Content */}
          {type === 'image' && (
            <img
              src={currentFile.url}
              alt={displayName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />
          )}

          {type === 'video' && (
            <video
              src={currentFile.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
            />
          )}

          {type === 'audio' && (
            <div className="flex flex-col items-center gap-4 p-8 bg-gray-800 rounded-lg">
              <Music className="h-24 w-24 text-orange-400" />
              <p className="text-white text-lg">{displayName}</p>
              <audio src={currentFile.url} controls autoPlay className="w-80" />
            </div>
          )}

          {type === 'pdf' && (
            <iframe
              src={currentFile.url}
              className="w-full h-full"
              title={displayName}
            />
          )}

          {type === 'file' && (
            <div className="flex flex-col items-center gap-4 p-8 bg-gray-800 rounded-lg">
              <File className="h-24 w-24 text-blue-400" />
              <p className="text-white text-lg">{displayName}</p>
              <Button onClick={onDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Thumbnail Component
function MediaThumbnail({ file, onClick, onDownload, showDownload = true, size = 'md' }: MediaThumbnailProps) {
  const { type, icon: Icon, color } = getFileTypeInfo(file)
  const displayName = getDisplayName(file)
  
  const sizeClasses = {
    sm: 'h-20',
    md: 'h-28',
    lg: 'h-36'
  }

  return (
    <div className="group relative border rounded-lg overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors">
      {/* Thumbnail Content */}
      <div 
        className={`${sizeClasses[size]} cursor-pointer flex items-center justify-center`}
        onClick={onClick}
      >
        {type === 'image' ? (
          <img
            src={file.url}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : type === 'video' ? (
          <div className="relative w-full h-full bg-black">
            <video
              src={file.url}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Video className="h-10 w-10 text-white" />
            </div>
          </div>
        ) : type === 'pdf' ? (
          <div className="flex flex-col items-center justify-center p-2">
            <FileText className={`h-12 w-12 ${color}`} />
            <span className="text-[10px] text-gray-500 mt-1 uppercase font-medium">PDF</span>
          </div>
        ) : type === 'audio' ? (
          <div className="flex flex-col items-center justify-center p-2">
            <Music className={`h-12 w-12 ${color}`} />
            <span className="text-[10px] text-gray-500 mt-1 uppercase font-medium">Audio</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-2">
            <Icon className={`h-12 w-12 ${color}`} />
            <span className="text-[10px] text-gray-500 mt-1 uppercase font-medium">File</span>
          </div>
        )}
      </div>

      {/* Filename & Download */}
      <div className="p-2 bg-white border-t">
        <p className="text-xs text-gray-700 truncate" title={displayName}>
          {displayName}
        </p>
        {showDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            title="Download"
          >
            <Download className="h-3.5 w-3.5 text-gray-600" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Main MediaViewer Component
export function MediaViewer({ 
  files, 
  title,
  gridCols = 3, 
  thumbnailSize = 'md',
  showDownload = true,
  emptyMessage = 'No files'
}: MediaViewerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Filter out empty/null values and normalize files
  const normalizedFiles: MediaFile[] = (files || [])
    .filter(f => f && (typeof f === 'string' ? f.trim() : f.url))
    .map(normalizeFile)

  if (normalizedFiles.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        {emptyMessage}
      </div>
    )
  }

  const handleOpenLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev - 1 + normalizedFiles.length) % normalizedFiles.length)
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % normalizedFiles.length)
  }

  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }

  return (
    <div>
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="text-xs text-gray-500">({normalizedFiles.length})</span>
        </div>
      )}
      
      <div className={`grid ${gridColsClass[gridCols]} gap-3`}>
        {normalizedFiles.map((file, index) => (
          <MediaThumbnail
            key={file.id || `${file.url}-${index}`}
            file={file}
            onClick={() => handleOpenLightbox(index)}
            onDownload={() => handleDownload(file)}
            showDownload={showDownload}
            size={thumbnailSize}
          />
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox
          files={normalizedFiles}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onDownload={() => handleDownload(normalizedFiles[currentIndex])}
        />
      )}
    </div>
  )
}

// Compact inline viewer for smaller spaces
export function MediaInline({ files, maxShow = 4 }: { files: MediaFile[] | string[], maxShow?: number }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const normalizedFiles: MediaFile[] = (files || [])
    .filter(f => f && (typeof f === 'string' ? f.trim() : f.url))
    .map(normalizeFile)

  if (normalizedFiles.length === 0) return null

  const visibleFiles = normalizedFiles.slice(0, maxShow)
  const remainingCount = normalizedFiles.length - maxShow

  return (
    <div className="flex items-center gap-2">
      {visibleFiles.map((file, index) => {
        const { type, icon: Icon, color } = getFileTypeInfo(file)
        return (
          <button
            key={file.id || `${file.url}-${index}`}
            onClick={() => {
              setCurrentIndex(index)
              setLightboxOpen(true)
            }}
            className="relative h-10 w-10 rounded border bg-gray-50 hover:border-blue-400 overflow-hidden flex items-center justify-center"
            title={getDisplayName(file)}
          >
            {type === 'image' ? (
              <img src={file.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon className={`h-5 w-5 ${color}`} />
            )}
          </button>
        )
      })}
      {remainingCount > 0 && (
        <button
          onClick={() => {
            setCurrentIndex(maxShow)
            setLightboxOpen(true)
          }}
          className="h-10 w-10 rounded border bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
        >
          +{remainingCount}
        </button>
      )}

      {lightboxOpen && (
        <Lightbox
          files={normalizedFiles}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onPrevious={() => setCurrentIndex(prev => (prev - 1 + normalizedFiles.length) % normalizedFiles.length)}
          onNext={() => setCurrentIndex(prev => (prev + 1) % normalizedFiles.length)}
          onDownload={() => handleDownload(normalizedFiles[currentIndex])}
        />
      )}
    </div>
  )
}

export default MediaViewer
