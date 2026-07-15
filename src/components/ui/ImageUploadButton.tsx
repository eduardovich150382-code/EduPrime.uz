'use client';

import { useState, useRef } from 'react';
import { Image, X, Loader2 } from 'lucide-react';

interface ImageUploadButtonProps {
  endpoint: 'questionImage' | 'optionImage' | 'solutionImage';
  onUpload: (url: string) => void;
  className?: string;
  label?: string;
}

/**
 * Rasm yuklash tugmasi - UploadThing orqali
 * Savol matni, variant rasmi yoki yechim rasmi uchun
 */
export default function ImageUploadButton({
  endpoint,
  onUpload,
  className = '',
  label = 'Rasm',
}: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Faqat rasm fayllari qo'llab-quvvatlanadi");
      return;
    }

    // Validate file size (max 2MB for question, 1MB for option)
    const maxSize = endpoint === 'optionImage' ? 1 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Rasm hajmi ${endpoint === 'optionImage' ? '1' : '2'} MB dan oshmasligi kerak`);
      return;
    }

    setUploading(true);
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      // Use a simple direct upload approach via our own proxy
      const res = await fetch(`/api/upload?endpoint=${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          onUpload(data.url);
        }
      } else {
        // Fallback: convert to base64 data URL for local preview
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          onUpload(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      // Fallback: convert to base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpload(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    setUploading(false);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`inline-flex ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-all disabled:opacity-50"
        title={`${label} yuklash`}
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Image size={14} />
        )}
        {label}
      </button>
    </div>
  );
}

interface ImagePreviewProps {
  images: string[];
  onRemove: (index: number) => void;
  className?: string;
}

export function ImagePreviewList({ images, onRemove, className = '' }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 mt-2 ${className}`}>
      {images.map((img, i) => (
        <div key={i} className="relative group">
          <img
            src={img}
            alt={`Rasm ${i + 1}`}
            className="h-16 w-auto object-contain rounded-lg border border-border"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
