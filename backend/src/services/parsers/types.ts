export interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  merchant?: string;
  reference?: string;
  raw: Record<string, string>;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: { row: number; message: string }[];
  parserUsed: string;
}

export interface BankParser {
  name: string;
  detect(headers: string[], sampleRows: Record<string, string>[]): boolean;
  parse(rows: Record<string, string>[]): ParseResult;
}
