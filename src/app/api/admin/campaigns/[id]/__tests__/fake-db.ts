// A5 route testlari uchun xotiradagi "baza". Shartli `updateMany`, relation
// filtri (`campaign: { finalizedAt: null }`), unique to'qnashuv (P2002) va
// tranzaksiya rollback shu yerda baholanadi — qulf mantig'ining o'zi
// tekshirilsin, mock "har doim count: 1" qaytarmasin. Haqiqiy Postgres
// qoplamasi — src/lib/__tests__/campaign-finalize.integration.test.ts.

export type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;
type Table = 'campaign' | 'campaignParticipant' | 'campaignReferral' | 'promoCode' | 'systemSetting' | 'campaignPost';

const OPERATORS = ['in', 'not', 'gt', 'lt', 'gte', 'lte'];
const UNIQUE: Partial<Record<Table, string[][]>> = {
  promoCode: [['code']],
  systemSetting: [['key']],
  campaignParticipant: [['refCode'], ['campaignId', 'telegramId']],
  campaignReferral: [['campaignId', 'referredTelegramId']],
};
const DEFAULTS: Partial<Record<Table, () => Record<string, unknown>>> = {
  campaignReferral: () => ({ status: 'PENDING', confirmedAt: null, checkedAt: null, referredUsername: null, referredFirstName: null, createdAt: new Date() }),
  promoCode: () => ({ usedAt: null, usedNote: null, createdAt: new Date() }),
  campaignParticipant: () => ({ username: null, firstName: null, createdAt: new Date() }),
};

const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
const cmp = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0);
const isOperator = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !(v instanceof Date)
  && Object.keys(v).length > 0 && Object.keys(v).every((k) => OPERATORS.includes(k));

function matchValue(value: unknown, cond: unknown): boolean {
  if (cond === null) return value === null || value === undefined;
  if (!isOperator(cond)) return same(value, cond);
  return Object.entries(cond).every(([op, arg]) => {
    if (op === 'in') return (arg as unknown[]).some((x) => same(value, x));
    if (op === 'not') return !matchValue(value, arg);
    if (value === null || value === undefined) return false;
    const c = cmp(value, arg);
    return op === 'gt' ? c > 0 : op === 'lt' ? c < 0 : op === 'gte' ? c >= 0 : c <= 0;
  });
}

export function createFakeDb() {
  const tables: Record<Table, Row[]> = { campaign: [], campaignParticipant: [], campaignReferral: [], promoCode: [], systemSetting: [], campaignPost: [] };
  let seq = 0;

  function matches(row: Row, where: Where | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, cond]) => {
      if (cond === undefined) return true;
      if (key === 'OR') return (cond as Where[]).some((w) => matches(row, w));
      if (key === 'AND') return (cond as Where[]).every((w) => matches(row, w));
      if (key === 'campaign') {
        const campaign = tables.campaign.find((c) => c.id === row.campaignId);
        return Boolean(campaign) && matches(campaign as Row, cond as Where);
      }
      if (key === 'campaignId_telegramId') return matches(row, cond as Where);
      return matchValue(row[key], cond);
    });
  }

  function sort(rows: Row[], orderBy: unknown): Row[] {
    const keys = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Record<string, 'asc' | 'desc'>[];
    return [...rows].sort((a, b) => {
      for (const o of keys) {
        const [k, dir] = Object.entries(o)[0];
        const c = cmp(a[k], b[k]);
        if (c !== 0) return dir === 'desc' ? -c : c;
      }
      return 0;
    });
  }

  function checkUnique(table: Table, row: Row, ignoreId?: string) {
    for (const fields of UNIQUE[table] ?? []) {
      if (tables[table].some((r) => r.id !== ignoreId && fields.every((f) => same(r[f], row[f])))) {
        throw Object.assign(new Error(`Unique constraint failed on ${fields.join(',')}`), { code: 'P2002' });
      }
    }
  }

  function project(table: Table, row: Row, args: { include?: Record<string, boolean>; select?: Record<string, boolean> }): Row {
    const out: Row = { ...row };
    if (args.include?.campaign) out.campaign = tables.campaign.find((c) => c.id === row.campaignId) ?? null;
    if (args.select) return Object.fromEntries(Object.keys(args.select).map((k) => [k, out[k]])) as Row;
    return out;
  }

  function model(table: Table) {
    const build = (data: Record<string, unknown>): Row => ({ id: `${table}${++seq}`, ...(DEFAULTS[table]?.() ?? {}), ...data } as Row);
    return {
      findUnique: async (args: { where: Where; include?: Record<string, boolean>; select?: Record<string, boolean> }) => {
        const row = tables[table].find((r) => matches(r, args.where));
        return row ? project(table, row, args) : null;
      },
      findFirst: async (args: { where?: Where; orderBy?: unknown; select?: Record<string, boolean>; include?: Record<string, boolean> } = {}) => {
        const row = sort(tables[table].filter((r) => matches(r, args.where)), args.orderBy)[0];
        return row ? project(table, row, args) : null;
      },
      findMany: async (args: { where?: Where; orderBy?: unknown; take?: number; select?: Record<string, boolean> } = {}) => {
        const rows = sort(tables[table].filter((r) => matches(r, args.where)), args.orderBy);
        return rows.slice(0, args.take ?? rows.length).map((r) => project(table, r, args));
      },
      count: async (args: { where?: Where } = {}) => tables[table].filter((r) => matches(r, args.where)).length,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = build(data);
        checkUnique(table, row);
        tables[table].push(row);
        return { ...row };
      },
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        const rows = data.map(build);
        const before = tables[table].length;
        try {
          for (const row of rows) {
            checkUnique(table, row);
            tables[table].push(row);
          }
        } catch (error) {
          tables[table].length = before;
          throw error;
        }
        return { count: rows.length };
      },
      update: async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
        const row = tables[table].find((r) => matches(r, where));
        if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
        const rows = tables[table].filter((r) => matches(r, where));
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      },
      upsert: async ({ where, update, create }: { where: Where; update: Record<string, unknown>; create: Record<string, unknown> }) => {
        const row = tables[table].find((r) => matches(r, where));
        if (row) return Object.assign(row, update);
        const created = build(create);
        tables[table].push(created);
        return { ...created };
      },
      deleteMany: async ({ where }: { where?: Where } = {}) => {
        const keep = tables[table].filter((r) => !matches(r, where));
        const count = tables[table].length - keep.length;
        tables[table] = keep;
        return { count };
      },
      groupBy: async ({ by, where }: { by: string[]; where?: Where }) => {
        const groups = new Map<string, Row[]>();
        for (const row of tables[table].filter((r) => matches(r, where))) {
          const key = by.map((k) => String(row[k])).join('|');
          groups.set(key, [...(groups.get(key) ?? []), row]);
        }
        return [...groups.values()].map((rows) => {
          const dates = rows.map((r) => r.confirmedAt).filter((d): d is Date => d instanceof Date);
          return {
            ...Object.fromEntries(by.map((k) => [k, rows[0][k]])),
            _count: { _all: rows.length },
            _max: { confirmedAt: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null },
          };
        });
      },
    };
  }

  const client = {
    campaign: model('campaign'),
    campaignParticipant: model('campaignParticipant'),
    campaignReferral: model('campaignReferral'),
    promoCode: model('promoCode'),
    systemSetting: model('systemSetting'),
    campaignPost: model('campaignPost'),
    user: { findUnique: async () => null as unknown },
    /** Interaktiv tranzaksiya: xato bo'lsa jadvallar oldingi holatiga qaytadi (Postgres rollback kabi). */
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const snapshot = Object.fromEntries(Object.entries(tables).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))])) as Record<Table, Row[]>;
      try {
        return await fn(client);
      } catch (error) {
        for (const key of Object.keys(tables) as Table[]) tables[key] = snapshot[key];
        throw error;
      }
    },
  };

  const reset = () => {
    for (const key of Object.keys(tables) as Table[]) tables[key] = [];
    seq = 0;
  };

  return { client, tables: () => tables, reset, insert: (table: Table, row: Row) => { tables[table].push(row); return row; } };
}

/** Testlar va `vi.mock('@/lib/db')` bir xil nusxani ishlatadi (vitest modul keshi). */
export const fake = createFakeDb();
