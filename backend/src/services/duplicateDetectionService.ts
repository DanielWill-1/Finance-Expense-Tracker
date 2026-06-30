import type { ParsedRow } from './parsers/types';

export interface DuplicateCheck {
  rowIndex: number;
  isDuplicate: boolean;
  reason: string;
  matchedTransactionId?: number;
}

export class DuplicateDetectionService {
  checkRows(rows: ParsedRow[], existingTransactionRows: { amount: number; date: string; description: string; merchant: string | null; id: number; external_id: string | null }[]): DuplicateCheck[] {
    return rows.map((row, idx) => {
      const match = existingTransactionRows.find(
        (existing) =>
          existing.amount === row.amount &&
          existing.date === row.date &&
          (existing.description.toLowerCase() === row.description.toLowerCase() ||
            (row.merchant &&
              existing.merchant?.toLowerCase() === row.merchant?.toLowerCase())),
      );

      if (match) {
        return {
          rowIndex: idx,
          isDuplicate: true,
          reason: `Matches existing transaction #${match.id} (${match.date}, ${match.description}, ${match.amount})`,
          matchedTransactionId: match.id,
        };
      }

      const fuzzyMatch = existingTransactionRows.find(
        (existing) =>
          existing.amount === row.amount &&
          existing.date === row.date &&
          existing.description.toLowerCase().includes(row.description.toLowerCase().slice(0, 8)),
      );

      if (fuzzyMatch) {
        return {
          rowIndex: idx,
          isDuplicate: true,
          reason: `Possible duplicate of #${fuzzyMatch.id} (same date, amount, similar description)`,
          matchedTransactionId: fuzzyMatch.id,
        };
      }

      return { rowIndex: idx, isDuplicate: false, reason: '' };
    });
  }
}
