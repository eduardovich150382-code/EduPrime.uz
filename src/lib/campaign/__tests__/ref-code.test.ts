import { describe, expect, it } from 'vitest';
import { campaignStartParameter, generateRefCode, parseCampaignStart } from '../ref-code';

describe('generateRefCode', () => {
  it('8 belgi [A-Za-z0-9], har safar boshqa', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRefCode()));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9]{8}$/);
  });
  it('start parametri ≤ 64 belgi va qayta o‘qiladi', () => {
    const code = generateRefCode();
    const param = campaignStartParameter(code);
    expect(param.length).toBeLessThanOrEqual(64);
    expect(parseCampaignStart(param)).toBe(code);
  });
});

describe('parseCampaignStart', () => {
  it.each(['c_Ab12Cd3', 'c_Ab12Cd345', 'c_Ab12-d34', 'C_Ab12Cd34', 'ref_Ab12Cd34', '', 'aksiya'])('%j → null', (param) => {
    expect(parseCampaignStart(param)).toBeNull();
  });
  it('to‘g‘ri kod', () => {
    expect(parseCampaignStart('c_Ab12Cd34')).toBe('Ab12Cd34');
  });
});
