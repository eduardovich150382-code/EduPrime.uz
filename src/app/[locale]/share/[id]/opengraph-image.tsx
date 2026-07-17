import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

export const runtime = 'edge';
export const alt = 'EduPrime.uz — Test natijasi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch result data
  let result: any = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz'}/api/share/result/${id}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      result = data.result;
    }
  } catch {
    // Fallback to generic image
  }

  // Default values if result not found
  const userName = result?.user?.name || 'Foydalanuvchi';
  const testTitle = result?.test?.titleUz || 'Test';
  const percentage = result?.percentage || 0;
  const score = result?.score || 0;
  const maxScore = result?.maxScore || 0;

  // Score color
  const scoreColor = percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#eab308' : '#ef4444';
  const scoreBg = percentage >= 80 ? '#f0fdf4' : percentage >= 60 ? '#fefce8' : '#fef2f2';
  const scoreEmoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '✅' : '📚';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #ede9fe 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              E
            </div>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              EduPrime.uz
            </span>
          </div>
          <span style={{ fontSize: '18px', color: '#6b7280' }}>Test Platformasi</span>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '60px',
          }}
        >
          {/* Score circle */}
          <div
            style={{
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background: scoreBg,
              border: `6px solid ${scoreColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '56px', fontWeight: 'bold', color: scoreColor }}>
              {percentage}%
            </span>
            <span style={{ fontSize: '18px', color: '#6b7280' }}>
              {score}/{maxScore} ball
            </span>
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <span style={{ fontSize: '20px', color: '#6b7280' }}>
              {scoreEmoji} {userName} ning natijasi
            </span>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1f2937',
                lineHeight: 1.3,
              }}
            >
              {testTitle}
            </span>
            <span style={{ fontSize: '18px', color: '#7c3aed', fontWeight: '600' }}>
              Siz ham o&apos;zingizni sinab ko&apos;ring!
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '20px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#6b7280' }}>
            eduprime.uz — DTM, Maktab, SAT, GRE testlari
          </span>
          <span style={{ fontSize: '16px', color: '#7c3aed', fontWeight: '600' }}>
            Bepul boshlang →
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
