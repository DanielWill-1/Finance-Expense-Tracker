import { describe, expect, it } from 'vitest';
import { ChaseParser, GenericParser, HDFCParser } from '../services/parsers/bankParsers';

describe('supported bank CSV parsers', () => {
  it('uses US month/day dates for Chase and preserves income/expense signs', () => {
    const parsed = new ChaseParser().parse([
      { 'Posting Date': '11/05/2026', Description: 'Coffee shop', Amount: '-12.50' },
      { 'Posting Date': '11/06/2026', Description: 'Payroll', Amount: '2500.00' },
    ]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.map(({ date, amount, type }) => ({ date, amount, type }))).toEqual([
      { date: '2026-11-05', amount: 12.5, type: 'expense' },
      { date: '2026-11-06', amount: 2500, type: 'income' },
    ]);
  });

  it('parses HDFC debit and credit grouping separators and DMY dates', () => {
    const parsed = new HDFCParser().parse([
      { Date: '05/11/2026', Narration: 'Card payment', Debit: '₹1,234.56', Credit: '' },
      { Date: '06/11/2026', Narration: 'Salary', Debit: '', Credit: '1,23,456.78' },
    ]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.map(({ date, amount, type }) => ({ date, amount, type }))).toEqual([
      { date: '2026-11-05', amount: 1234.56, type: 'expense' },
      { date: '2026-11-06', amount: 123456.78, type: 'income' },
    ]);
  });

  it('rejects malformed amounts and ambiguous generic dates with source row numbers', () => {
    const parsed = new GenericParser().parse([
      { date: '11/05/2026', description: 'Ambiguous', amount: '10.00' },
      { date: '2026-11-05', description: 'Malformed amount', amount: '100oops' },
      { date: 'INVALID_DATE', description: 'Invalid date', amount: '25' },
      { date: '2026-02-30', description: '', amount: '25' },
      { date: '2026-02-28', description: 'Non-finite amount', amount: 'Infinity' },
    ]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.date).toBe('11/05/2026');
    expect(parsed.rows[1]?.date).toBe('INVALID_DATE');
    expect(parsed.errors).toEqual([
      { row: 2, message: 'Invalid amount' },
      { row: 4, message: 'Missing date or description' },
      { row: 5, message: 'Invalid amount' },
    ]);
  });
});
