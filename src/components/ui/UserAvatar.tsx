'use client';

import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Optimized user avatar component using next/image.
 * Handles local SVG avatars and remote images (Google, Cloudinary, UploadThing).
 */
export default function UserAvatar({
  src,
  alt = '',
  size = 40,
  className = '',
  fallbackClassName = '',
}: UserAvatarProps) {
  if (!src) {
    return (
      <div
        className={`rounded-full bg-primary-100 flex items-center justify-center ${fallbackClassName}`}
        style={{ width: size, height: size }}
      >
        <User size={size * 0.45} className="text-primary-600" />
      </div>
    );
  }

  // Local SVG avatars
  if (src.startsWith('/avatars/')) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        priority={size >= 80}
      />
    );
  }

  // Remote images (Google, Cloudinary, UploadThing)
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      unoptimized={src.startsWith('http')}
    />
  );
}
