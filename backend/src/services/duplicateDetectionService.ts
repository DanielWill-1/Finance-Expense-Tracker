import type { ParsedRow } from './parsers/types';

export interface DuplicateCheck {
  rowIndex: number;
  isDuplicate: boolean;
  reason: string;
  matchedTransactionId?: number;
}

export interface ExistingTransactionForDuplicate {
  amount: number;
  date: string;
  description: string;
  merchant: string | null;
  id: number;
  external_id: string | null;
  type: 'income' | 'expense';
  account_id?: number | null;
}

function rowKey(row: { amount: number; date: string; type: 'income' | 'expense' }): string {
  return `${row.amount}|${row.date}|${row.type}`;
}

export class DuplicateDetectionService {
  checkRows(
    rows: ParsedRow[],
    existingRows: ExistingTransactionForDuplicate[],
    accountId?: number,
  ): DuplicateCheck[] {
    const byExternalId = new Map<string, ExistingTransactionForDuplicate>();
    const byTransactionKey = new Map<string, ExistingTransactionForDuplicate[]>();
    const addToIndex = (row: ExistingTransactionForDuplicate) => {
      if (row.external_id) byExternalId.set(row.external_id, row);
      const key = rowKey(row);
      const matches = byTransactionKey.get(key) ?? [];
      matches.push(row);
      byTransactionKey.set(key, matches);
    };
    existingRows.forEach(addToIndex);

    return rows.map((row, rowIndex) => {
      const candidates = (byTransactionKey.get(rowKey(row)) ?? []).filter(
        (candidate) => accountId === undefined || candidate.account_id === accountId,
      );
      const normalizedDescription = row.description.trim().toLowerCase();
      const normalizedMerchant = row.merchant?.trim().toLowerCase();
      const byReferenceCandidate = row.reference ? byExternalId.get(row.reference) : undefined;
      const byReference =
        byReferenceCandidate &&
        (accountId === undefined || byReferenceCandidate.account_id === accountId)
          ? byReferenceCandidate
          : undefined;
      const exact =
        byReference ??
        candidates.find((existing) => {
          const description = existing.description.trim().toLowerCase();
          const merchant = existing.merchant?.trim().toLowerCase();
          return (
            description === normalizedDescription ||
            Boolean(normalizedMerchant && merchant === normalizedMerchant)
          );
        });
      const fuzzy = exact
        ? undefined
        : candidates.find((existing) => {
            return (
              normalizedDescription.length >= 8 &&
              existing.description.trim().toLowerCase().includes(normalizedDescription.slice(0, 8))
            );
          });
      const duplicate = exact ?? fuzzy;
      const result: DuplicateCheck = duplicate
        ? {
            rowIndex,
            isDuplicate: true,
            reason: exact
              ? `Matches transaction (${duplicate.date}, ${duplicate.description}, ${duplicate.amount})`
              : `Possible duplicate (same date, amount, and similar description)`,
            ...(duplicate.id > 0 ? { matchedTransactionId: duplicate.id } : {}),
          }
        : { rowIndex, isDuplicate: false, reason: '' };

      if (!duplicate) {
        addToIndex({
          id: -(rowIndex + 1),
          amount: row.amount,
          date: row.date,
          description: row.description,
          merchant: row.merchant ?? null,
          external_id: row.reference ?? null,
          type: row.type,
          ...(accountId === undefined ? {} : { account_id: accountId }),
        });
      }
      return result;
    });
  }
}
