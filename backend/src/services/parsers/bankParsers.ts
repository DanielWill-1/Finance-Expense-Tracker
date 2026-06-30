import type { BankParser, ParsedRow, ParseResult } from './types';

function parseDate(raw: string): string {
  const cleaned = raw.trim();
  const ddmmyyyy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(cleaned);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${(m ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
  }
  const yyyymmdd = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/.exec(cleaned);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${(m ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
  }
  return cleaned;
}

function parseAmount(raw: string): { amount: number; type: 'income' | 'expense' } {
  const cleaned = raw.replace(/[₹$€£,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { amount: 0, type: 'expense' };
  return { amount: Math.abs(num), type: num >= 0 ? 'income' : 'expense' };
}

function findColumn(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return headers[idx] ?? null;
  }
  return null;
}

export class HDFCParser implements BankParser {
  name = 'HDFC';

  detect(headers: string[]): boolean {
    const h = headers.map((x) => x.toLowerCase());
    return h.includes('date') && h.includes('narration') && (h.includes('debit') || h.includes('credit'));
  }

  parse(rows: Record<string, string>[]): ParseResult {
    const result: ParsedRow[] = [];
    const errors: ParseResult['errors'] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {};
      const dateStr = row['Date'] ?? row['date'] ?? '';
      const desc = row['Narration'] ?? row['narration'] ?? '';
      const debit = row['Debit'] ?? row['debit'] ?? '0';
      const credit = row['Credit'] ?? row['credit'] ?? '0';

      if (!dateStr || !desc) {
        errors.push({ row: i + 1, message: 'Missing date or narration' });
        continue;
      }
      const date = parseDate(dateStr);
      const debitAmt = parseFloat(debit);
      const creditAmt = parseFloat(credit);
      const isDebit = !isNaN(debitAmt) && debitAmt > 0;

      result.push({
        date,
        description: desc.trim(),
        amount: isDebit ? debitAmt : creditAmt,
        type: isDebit ? 'expense' : 'income',
        raw: row,
      });
    }
    return { rows: result, errors, parserUsed: this.name };
  }
}

export class ChaseParser implements BankParser {
  name = 'Chase';

  detect(headers: string[]): boolean {
    const h = headers.map((x) => x.toLowerCase());
    return h.includes('posting date') || (h.includes('transaction date') && h.includes('description'));
  }

  parse(rows: Record<string, string>[]): ParseResult {
    const result: ParsedRow[] = [];
    const errors: ParseResult['errors'] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {};
      const dateStr = row['Posting Date'] ?? row['Transaction Date'] ?? '';
      const desc = row['Description'] ?? '';
      const amountStr = row['Amount'] ?? '0';

      if (!dateStr || !desc) {
        errors.push({ row: i + 1, message: 'Missing date or description' });
        continue;
      }

      const { amount, type } = parseAmount(amountStr);
      if (amount === 0) {
        errors.push({ row: i + 1, message: 'Invalid amount' });
        continue;
      }

      result.push({
        date: parseDate(dateStr),
        description: desc.trim(),
        amount,
        type,
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
    const dateCol = findColumn(
      Object.keys(rows[0] ?? {}),
      ['date', 'transaction date', 'posting date', 'value date'],
    );
    const descCol = findColumn(
      Object.keys(rows[0] ?? {}),
      ['description', 'narration', 'narrative', 'memo', 'particulars'],
    );
    const amountCol = findColumn(Object.keys(rows[0] ?? {}), ['amount', 'value', 'transaction amount']);
    const debitCol = findColumn(Object.keys(rows[0] ?? {}), ['debit', 'withdrawal', 'dr']);
    const creditCol = findColumn(Object.keys(rows[0] ?? {}), ['credit', 'deposit', 'cr']);
    const merchantCol = findColumn(Object.keys(rows[0] ?? {}), ['merchant', 'payee', 'name']);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {};
      const dateStr = dateCol ? (row[dateCol] ?? '') : '';
      const desc = descCol ? (row[descCol] ?? '') : '';

      if (!dateStr || !desc) {
        errors.push({ row: i + 1, message: 'Missing date or description' });
        continue;
      }

      let amount = 0;
      let type: 'income' | 'expense' = 'expense';

      if (amountCol && row[amountCol]) {
        const parsed = parseAmount(row[amountCol] ?? '');
        amount = parsed.amount;
        type = parsed.type;
      } else if (debitCol && parseFloat(row[debitCol] ?? '0') > 0) {
        amount = parseFloat(row[debitCol] ?? '0');
        type = 'expense';
      } else if (creditCol && parseFloat(row[creditCol] ?? '0') > 0) {
        amount = parseFloat(row[creditCol] ?? '0');
        type = 'income';
      }

      if (amount === 0) {
        errors.push({ row: i + 1, message: 'Could not determine amount' });
        continue;
      }

      const merchant = merchantCol ? (row[merchantCol] ?? undefined) : undefined;
      result.push({
        date: parseDate(dateStr),
        description: desc.trim(),
        amount,
        type,
        ...(merchant ? { merchant } : {}),
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

export function detectParser(
  headers: string[],
  sampleRows: Record<string, string>[],
): BankParser {
  for (const parser of BUILTIN_PARSERS) {
    if (parser.name === 'Generic') continue;
    if (parser.detect(headers, sampleRows)) return parser;
  }
  return new GenericParser();
}
