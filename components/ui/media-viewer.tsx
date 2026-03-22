'use client'

import { useState, useRef, useEffect } from 'react'
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
  ExternalLink,
  Play,
  Eye
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
    return { type: 'image', icon: ImageIcon, color: 'text-ds-green' }
  }
  if (mimeType.startsWith('video/')) {
    return { type: 'video', icon: Video, color: 'text-text-secondary' }
  }
  if (mimeType.startsWith('audio/')) {
    return { type: 'audio', icon: Music, color: 'text-ds-amber' }
  }
  if (mimeType === 'application/pdf') {
    return { type: 'pdf', icon: FileText, color: 'text-ds-red' }
  }
  return { type: 'file', icon: File, color: 'text-ds-blue' }
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
        <div className="flex items-center justify-between p-3 border-b bg-surface2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium truncate max-w-[300px]">{displayName}</span>
            <span className="text-xs text-text-muted">
              {currentIndex + 1} of {files.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {type === 'image' && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-text-muted w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRotate} title="Rotate">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
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
        <div className="flex-1 relative flex items-center justify-center overflow-hidden" style={{ height: 'calc(95vh - 60px)', backgroundColor: '#111' }}>
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
            <div className="flex flex-col items-center gap-4 p-8 rounded-lg" style={{ backgroundColor: 'var(--accent)' }}>
              <Music className="h-24 w-24 text-ds-amber" />
              <p className="text-bg text-lg">{displayName}</p>
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
            <div className="flex flex-col items-center gap-4 p-8 rounded-lg" style={{ backgroundColor: 'var(--accent)' }}>
              <File className="h-24 w-24 text-ds-blue" />
              <p className="text-bg text-lg">{displayName}</p>
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
    <div className="group relative border rounded-lg overflow-hidden bg-surface2 hover:border-accent transition-colors">
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
            <span className="text-[10px] text-text-muted mt-1 uppercase font-medium">PDF</span>
          </div>
        ) : type === 'audio' ? (
          <div className="flex flex-col items-center justify-center p-2">
            <Music className={`h-12 w-12 ${color}`} />
            <span className="text-[10px] text-text-muted mt-1 uppercase font-medium">Audio</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-2">
            <Icon className={`h-12 w-12 ${color}`} />
            <span className="text-[10px] text-text-muted mt-1 uppercase font-medium">File</span>
          </div>
        )}
      </div>

      {/* Filename & Download */}
      <div className="p-2 bg-surface border-t border-border">
        <p className="text-xs text-text-secondary truncate" title={displayName}>
          {displayName}
        </p>
        {showDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0 bg-surface/90 hover:bg-surface shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            title="Download"
          >
            <Download className="h-3.5 w-3.5 text-text-secondary" />
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
      <div className="text-sm text-text-muted py-2">
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
          <ImageIcon className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium text-text-secondary">{title}</span>
          <span className="text-xs text-text-muted">({normalizedFiles.length})</span>
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
            className="relative h-10 w-10 rounded border bg-surface2 hover:border-accent overflow-hidden flex items-center justify-center"
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
          className="h-10 w-10 rounded border bg-surface2 hover:bg-border flex items-center justify-center text-xs font-medium text-text-muted"
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

// Hover Preview Component - Shows preview on hover like YouTube
interface MediaHoverPreviewProps {
  file: MediaFile | string
  children: React.ReactNode
  previewSize?: 'sm' | 'md' | 'lg'
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  showFileName?: boolean
  className?: string
}

export function MediaHoverPreview({ 
  file, 
  children, 
  previewSize = 'md',
  position = 'auto',
  showFileName = true,
  className = ''
}: MediaHoverPreviewProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top')
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const normalizedFile = normalizeFile(file)
  const { type, icon: Icon, color } = getFileTypeInfo(normalizedFile)
  const displayName = getDisplayName(normalizedFile)

  const sizeClasses = {
    sm: { width: 'w-48', height: 'h-32' },
    md: { width: 'w-64', height: 'h-44' },
    lg: { width: 'w-80', height: 'h-56' }
  }

  // Calculate position on hover
  useEffect(() => {
    if (isHovering && containerRef.current && position === 'auto') {
      const rect = containerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Determine best position based on available space
      const spaceTop = rect.top
      const spaceBottom = viewportHeight - rect.bottom
      const spaceLeft = rect.left
      const spaceRight = viewportWidth - rect.right

      if (spaceTop > 200) {
        setPreviewPosition('top')
      } else if (spaceBottom > 200) {
        setPreviewPosition('bottom')
      } else if (spaceRight > 300) {
        setPreviewPosition('right')
      } else if (spaceLeft > 300) {
        setPreviewPosition('left')
      } else {
        setPreviewPosition('top')
      }
    } else if (position !== 'auto') {
      setPreviewPosition(position)
    }
  }, [isHovering, position])

  // Auto-play video on hover
  useEffect(() => {
    if (isHovering && type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else if (!isHovering && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [isHovering, type])

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true)
    }, 300) // Small delay to prevent accidental triggers
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsHovering(false)
  }

  const positionStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  const arrowStyles: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-accent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-accent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-accent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-accent'
  }

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Hover Preview Popup */}
      {isHovering && (
        <div
          ref={previewRef}
          className={`absolute z-50 ${positionStyles[previewPosition]} animate-in fade-in-0 zoom-in-95 duration-200`}
        >
          <div className={`rounded-lg shadow-2xl overflow-hidden ${sizeClasses[previewSize].width}`} style={{ backgroundColor: 'var(--accent)' }}>
            {/* Preview Content */}
            <div className={`relative ${sizeClasses[previewSize].height} flex items-center justify-center`} style={{ backgroundColor: '#111' }}>
              {type === 'image' && (
                <img
                  src={normalizedFile.url}
                  alt={displayName}
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              )}

              {type === 'video' && (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={normalizedFile.url}
                    className="w-full h-full object-contain"
                    muted
                    loop
                    playsInline
                  />
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="bg-surface/90 rounded-full p-3">
                        <Play className="h-8 w-8 text-text-primary fill-text-primary" />
                      </div>
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ds-red)' }} />
                      Preview
                    </div>
                  )}
                </div>
              )}

              {type === 'audio' && (
                <div className="flex flex-col items-center justify-center gap-3 p-4">
                  <div className="rounded-full p-4" style={{ backgroundColor: 'rgba(146,64,14,0.2)' }}>
                    <Music className="h-12 w-12 text-ds-amber" />
                  </div>
                  <audio
                    src={normalizedFile.url}
                    controls
                    className="w-full max-w-[200px]"
                    style={{ height: '32px' }}
                  />
                </div>
              )}

              {type === 'pdf' && (
                <div className="w-full h-full">
                  <iframe
                    src={`${normalizedFile.url}#toolbar=0&navpanes=0`}
                    className="w-full h-full"
                    title={displayName}
                  />
                </div>
              )}

              {type === 'file' && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="rounded-full p-4" style={{ backgroundColor: 'rgba(42,40,37,0.4)' }}>
                    <Icon className={`h-12 w-12 ${color}`} />
                  </div>
                  <span className="text-text-muted text-xs uppercase">Document</span>
                </div>
              )}

              {/* Eye indicator */}
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Preview
              </div>
            </div>

            {/* File name footer */}
            {showFileName && (
              <div className="px-3 py-2 border-t" style={{ backgroundColor: 'var(--accent)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <p className="text-bg text-xs truncate" title={displayName}>
                  {displayName}
                </p>
                <p className="text-[10px] uppercase mt-0.5" style={{ color: 'rgba(247,246,243,0.5)' }}>
                  {type === 'image' ? 'Image' : type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : type === 'pdf' ? 'PDF Document' : 'File'}
                </p>
              </div>
            )}
          </div>

          {/* Arrow pointer */}
          <div className={`absolute w-0 h-0 border-8 ${arrowStyles[previewPosition]}`} />
        </div>
      )}
    </div>
  )
}

// File link with hover preview
interface FilePreviewLinkProps {
  file: MediaFile | string
  className?: string
  showIcon?: boolean
  onClick?: () => void
}

export function FilePreviewLink({ file, className = '', showIcon = true, onClick }: FilePreviewLinkProps) {
  const normalizedFile = normalizeFile(file)
  const { type, icon: Icon, color } = getFileTypeInfo(normalizedFile)
  const displayName = getDisplayName(normalizedFile)

  return (
    <MediaHoverPreview file={file}>
      <button
        onClick={onClick || (() => window.open(normalizedFile.url, '_blank'))}
        className={`inline-flex items-center gap-2 text-sm text-ds-blue hover:underline ${className}`}
      >
        {showIcon && <Icon className={`h-4 w-4 ${color}`} />}
        <span className="truncate max-w-[200px]">{displayName}</span>
      </button>
    </MediaHoverPreview>
  )
}

// Attachment chip with hover preview
interface AttachmentChipProps {
  file: MediaFile | string
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export function AttachmentChip({ file, onRemove, onClick, className = '' }: AttachmentChipProps) {
  const normalizedFile = normalizeFile(file)
  const { type, icon: Icon, color } = getFileTypeInfo(normalizedFile)
  const displayName = getDisplayName(normalizedFile)

  return (
    <MediaHoverPreview file={file} previewSize="sm">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 bg-surface2 hover:bg-border rounded-full text-sm transition-colors ${className}`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <button
          onClick={onClick || (() => window.open(normalizedFile.url, '_blank'))}
          className="truncate max-w-[150px] text-text-secondary hover:text-text-primary"
        >
          {displayName}
        </button>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="text-text-muted hover:text-ds-red ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </MediaHoverPreview>
  )
}

// Export utility functions for use in other components
export { normalizeFile, getDisplayName, getFileTypeInfo, handleDownload }

export default MediaViewer
