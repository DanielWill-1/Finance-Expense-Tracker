import type { BankParser, ParsedRow, ParseResult } from './types';

type DateStyle = 'dmy' | 'mdy' | 'generic';

function parseDate(raw: string, style: DateStyle): string {
  const cleaned = raw.trim();
  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(cleaned);
  if (ymd) return `${ymd[1]}-${(ymd[2] ?? '').padStart(2, '0')}-${(ymd[3] ?? '').padStart(2, '0')}`;

  const parts = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(cleaned);
  if (!parts) return cleaned;
  const first = Number(parts[1]);
  const second = Number(parts[2]);
  let day: number;
  let month: number;
  if (style === 'dmy') {
    day = first;
    month = second;
  } else if (style === 'mdy') {
    month = first;
    day = second;
  } else if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    month = first;
    day = second;
  } else {
    return cleaned;
  }
  return `${parts[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseAmount(raw: string): { amount: number; type: 'income' | 'expense'; valid: boolean } {
  let cleaned = raw.replace(/\p{Sc}/gu, '').replace(/\s/g, '');
  let parenthesized = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    parenthesized = true;
    cleaned = cleaned.slice(1, -1);
  }
  const numeric =
    /^(?:[+-])?(?:(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3}|\d+)(?:\.\d{1,2})?|\.\d{1,2})$/;
  if (!numeric.test(cleaned)) return { amount: 0, type: 'expense', valid: false };
  const value = Number(cleaned.replace(/,/g, '')) * (parenthesized ? -1 : 1);
  if (!Number.isFinite(value)) return { amount: 0, type: 'expense', valid: false };
  return { amount: Math.abs(value), type: value < 0 ? 'expense' : 'income', valid: true };
}

function valueFrom(row: Record<string, string>, ...names: string[]): string {
  const values = new Map(
    Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), value]),
  );
  for (const name of names) {
    const value = values.get(name.toLowerCase());
    if (value !== undefined) return value;
  }
  return '';
}

function parseColumnAmount(raw: string, type: 'income' | 'expense') {
  const parsed = parseAmount(raw);
  return { ...parsed, type };
}

function findColumn(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const index = lower.indexOf(candidate.toLowerCase());
    if (index >= 0) return headers[index] ?? null;
  }
  return null;
}

export class HDFCParser implements BankParser {
  name = 'HDFC';

  detect(headers: string[]): boolean {
    const normalized = headers.map((header) => header.toLowerCase());
    return (
      normalized.includes('date') &&
      normalized.includes('narration') &&
      (normalized.includes('debit') || normalized.includes('credit'))
    );
  }

  parse(rows: Record<string, string>[]): ParseResult {
    const result: ParsedRow[] = [];
    const errors: ParseResult['errors'] = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] ?? {};
      const date = valueFrom(row, 'date');
      const description = valueFrom(row, 'narration');
      const debitRaw = valueFrom(row, 'debit') || '0';
      const creditRaw = valueFrom(row, 'credit') || '0';
      if (!date || !description.trim()) {
        errors.push({ row: index + 1, message: 'Missing date or narration' });
        continue;
      }
      const debit = parseColumnAmount(debitRaw, 'expense');
      const credit = parseColumnAmount(creditRaw, 'income');
      if (!debit.valid || !credit.valid || (debit.amount > 0 && credit.amount > 0)) {
        errors.push({ row: index + 1, message: 'Invalid or ambiguous debit/credit amount' });
        continue;
      }
      const amount = debit.amount > 0 ? debit.amount : credit.amount;
      if (amount <= 0) {
        errors.push({ row: index + 1, message: 'Could not determine transaction amount' });
        continue;
      }
      result.push({
        sourceRow: index + 1,
        date: parseDate(date, 'dmy'),
        description: description.trim(),
        amount,
        type: debit.amount > 0 ? 'expense' : 'income',
        raw: row,
      });
    }
    return { rows: result, errors, parserUsed: this.name };
  }
}

export class ChaseParser implements BankParser {
  name = 'Chase';

  detect(headers: string[]): boolean {
    const normalized = headers.map((header) => header.toLowerCase());
    return (
      normalized.includes('posting date') ||
      (normalized.includes('transaction date') && normalized.includes('description'))
    );
  }

  parse(rows: Record<string, string>[]): ParseResult {
    const result: ParsedRow[] = [];
    const errors: ParseResult['errors'] = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] ?? {};
      const date = valueFrom(row, 'posting date', 'transaction date');
      const description = valueFrom(row, 'description');
      const amount = parseAmount(valueFrom(row, 'amount'));
      if (!date || !description.trim()) {
        errors.push({ row: index + 1, message: 'Missing date or description' });
        continue;
      }
      if (!amount.valid || amount.amount <= 0) {
        errors.push({ row: index + 1, message: 'Invalid amount' });
        continue;
      }
      result.push({
        sourceRow: index + 1,
        date: parseDate(date, 'mdy'),
        description: description.trim(),
        amount: amount.amount,
        type: amount.type,
        raw: row,
      });
    }
    return { rows: result, errors, parserUsed: this.name };
  }
}

export class GenericParser implements BankParser {
  name = 'Generic';

  detect(): boolean {
    return true;
  }

  parse(rows: Record<string, string>[]): ParseResult {
    const result: ParsedRow[] = [];
    const errors: ParseResult['errors'] = [];
    const headers = Object.keys(rows[0] ?? {});
    const dateColumn = findColumn(headers, [
      'date',
      'transaction date',
      'posting date',
      'value date',
    ]);
    const descriptionColumn = findColumn(headers, [
      'description',
      'narration',
      'narrative',
      'memo',
      'particulars',
    ]);
    const amountColumn = findColumn(headers, ['amount', 'value', 'transaction amount']);
    const debitColumn = findColumn(headers, ['debit', 'withdrawal', 'dr']);
    const creditColumn = findColumn(headers, ['credit', 'deposit', 'cr']);
    const merchantColumn = findColumn(headers, ['merchant', 'payee', 'name']);
    const externalIdColumn = findColumn(headers, [
      'external id',
      'transaction id',
      'reference',
      'reference number',
    ]);

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] ?? {};
      const date = dateColumn ? valueFrom(row, dateColumn) : '';
      const description = descriptionColumn ? valueFrom(row, descriptionColumn) : '';
      if (!date || !description.trim()) {
        errors.push({ row: index + 1, message: 'Missing date or description' });
        continue;
      }

      let amount = 0;
      let type: 'income' | 'expense' = 'expense';
      if (amountColumn && valueFrom(row, amountColumn)) {
        const parsed = parseAmount(valueFrom(row, amountColumn));
        if (!parsed.valid || parsed.amount <= 0) {
          errors.push({ row: index + 1, message: 'Invalid amount' });
          continue;
        }
        amount = parsed.amount;
        type = parsed.type;
      } else if (debitColumn || creditColumn) {
        const debitRaw = debitColumn ? valueFrom(row, debitColumn).trim() : '';
        const creditRaw = creditColumn ? valueFrom(row, creditColumn).trim() : '';
        const debit = debitRaw ? parseColumnAmount(debitRaw, 'expense') : null;
        const credit = creditRaw ? parseColumnAmount(creditRaw, 'income') : null;
        if (
          (debit && !debit.valid) ||
          (credit && !credit.valid) ||
          (debit?.amount && credit?.amount)
        ) {
          errors.push({ row: index + 1, message: 'Invalid or ambiguous debit/credit amount' });
          continue;
        }
        if (debit?.amount) {
          amount = debit.amount;
          type = 'expense';
        } else if (credit?.amount) {
          amount = credit.amount;
          type = 'income';
        }
      }
      if (amount <= 0) {
        errors.push({ row: index + 1, message: 'Could not determine amount' });
        continue;
      }

      const merchant = merchantColumn ? valueFrom(row, merchantColumn) : '';
      const externalId = externalIdColumn ? valueFrom(row, externalIdColumn) : '';
      result.push({
        sourceRow: index + 1,
        date: parseDate(date, 'generic'),
        description: description.trim(),
        amount,
        type,
        ...(merchant ? { merchant } : {}),
        ...(externalId ? { reference: externalId } : {}),
        raw: row,
      });
    }
    return { rows: result, errors, parserUsed: this.name };
  }
}

export const BUILTIN_PARSERS: BankParser[] = [
  new HDFCParser(),
  new ChaseParser(),
  new GenericParser(),
];

export function detectParser(headers: string[], sampleRows: Record<string, string>[]): BankParser {
  for (const parser of BUILTIN_PARSERS) {
    if (parser.name === 'Generic') continue;
    if (parser.detect(headers, sampleRows)) return parser;
  }
  return new GenericParser();
}
