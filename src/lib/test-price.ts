import { z } from 'zod';

export const testPriceSchema = z.number().int().min(0).max(2147483647);
