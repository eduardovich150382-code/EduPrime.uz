'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  onClick?: () => void;
}

/**
 * Optimized image component for dynamic content (test covers, question images).
 * Uses next/image for automatic lazy loading, WebP conversion for supported domains.
 * Falls back to unoptimized for external URLs not in remotePatterns.
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  fill = false,
  priority = false,
  onClick,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}>
        <span className="text-xs">Rasm yuklanmadi</span>
      </div>
    );
  }

  // Determine if image is from a known optimizable source
  const isOptimizable =
    src.startsWith('/') ||
    src.includes('res.cloudinary.com') ||
    src.includes('lh3.googleusercontent.com') ||
    src.includes('utfs.io') ||
    src.includes('uploadthing.com');

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        unoptimized={!isOptimizable}
        onError={() => setError(true)}
        priority={priority}
        onClick={onClick}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 400}
      height={height || 300}
      className={className}
      unoptimized={!isOptimizable}
      onError={() => setError(true)}
      priority={priority}
      onClick={onClick}
      style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
    />
  );
}
