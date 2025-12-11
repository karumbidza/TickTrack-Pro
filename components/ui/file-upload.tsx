import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, File, X } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 10,
  className = ""
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): boolean => {
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024)
    if (fileSizeInMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB`)
      return false
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim())
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      return file.type.includes(type)
    })

    if (!isValidType) {
      setError('File type not supported')
      return false
    }

    setError(null)
    return true
  }

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={className}>
      {selectedFile ? (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFileRemove}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className={`mx-auto h-12 w-12 ${error ? 'text-red-400' : 'text-gray-400'}`} />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Upload a file
              </span>
              <span className="text-sm text-gray-500"> or drag and drop</span>
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept={accept}
              onChange={handleInputChange}
              className="sr-only"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {accept.replace(/\./g, '').toUpperCase()} up to {maxSize}MB
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}