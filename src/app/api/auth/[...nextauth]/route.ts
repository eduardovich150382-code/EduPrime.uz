import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;

// Force Node.js runtime (not Edge) for Prisma compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
