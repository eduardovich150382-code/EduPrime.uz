import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'EduPrime.uz — Sertifikat';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;

  let certificate: any = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz'}/api/certificate/${enrollmentId}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      certificate = data.certificate;
    }
  } catch {
    // Fallback to generic image
  }

  const userName = certificate?.user?.name || 'Foydalanuvchi';
  const courseTitle = certificate?.course?.titleUz || 'Kurs';
  const teacherName = certificate?.course?.teacherName || '';
  const completedDate = certificate?.completedAt
    ? new Date(certificate.completedAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 55%, #fef3c7 100%)',
          padding: '16px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid #f59e0b',
            borderRadius: '20px',
            padding: '48px 64px',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              E
            </div>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937' }}>EduPrime.uz</span>
          </div>

          <span style={{ fontSize: '15px', letterSpacing: '4px', color: '#d97706', fontWeight: 700 }}>
            MUVAFFAQIYAT SERTIFIKATI
          </span>

          <span style={{ fontSize: '18px', color: '#6b7280', marginTop: '28px' }}>
            Ushbu sertifikat tasdiqlaydiki,
          </span>
          <span style={{ fontSize: '46px', fontWeight: 'bold', color: '#1f2937', marginTop: '10px' }}>
            {userName}
          </span>
          <span style={{ fontSize: '18px', color: '#6b7280', marginTop: '14px' }}>
            quyidagi kursni muvaffaqiyatli tugatdi:
          </span>
          <span style={{ fontSize: '30px', fontWeight: 700, color: '#6d28d9', marginTop: '10px', maxWidth: '900px' }}>
            &ldquo;{courseTitle}&rdquo;
          </span>

          <div style={{ display: 'flex', gap: '48px', marginTop: '32px' }}>
            {completedDate && (
              <span style={{ fontSize: '16px', color: '#6b7280' }}>{completedDate}</span>
            )}
            {teacherName && (
              <span style={{ fontSize: '16px', color: '#6b7280' }}>O&apos;qituvchi: {teacherName}</span>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
