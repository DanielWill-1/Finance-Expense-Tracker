import { RuleRepository } from '../repositories/ruleRepository';

export interface RuleMatch {
  ruleId: number;
  categoryId: number;
  matchedBy: string;
}

export class RuleEngineService {
  constructor(private ruleRepo: RuleRepository) {}

  evaluateTransaction(transaction: {
    description: string;
    merchant?: string | null | undefined;
  }): RuleMatch | null {
    const rules = this.ruleRepo.findAllEnabled();
    const text = transaction.description.toLowerCase();
    const merchant = (transaction.merchant || '').toLowerCase();

    for (const rule of rules) {
      if (rule.contains_text) {
        const term = rule.contains_text.toLowerCase();
        if (text.includes(term) || merchant.includes(term)) {
          return {
            ruleId: rule.id,
            categoryId: rule.category_id!,
            matchedBy: `contains:${rule.contains_text}`,
          };
        }
      }

      if (rule.starts_with) {
        const prefix = rule.starts_with.toLowerCase();
        if (text.startsWith(prefix) || merchant.startsWith(prefix)) {
          return {
            ruleId: rule.id,
            categoryId: rule.category_id!,
            matchedBy: `starts_with:${rule.starts_with}`,
          };
        }
      }

      if (rule.ends_with) {
        const suffix = rule.ends_with.toLowerCase();
        if (text.endsWith(suffix) || merchant.endsWith(suffix)) {
          return {
            ruleId: rule.id,
            categoryId: rule.category_id!,
            matchedBy: `ends_with:${rule.ends_with}`,
          };
        }
      }

      if (rule.regex) {
        try {
          const regex = new RegExp(rule.regex, 'i');
          if (regex.test(text) || regex.test(merchant)) {
            return {
              ruleId: rule.id,
              categoryId: rule.category_id!,
              matchedBy: `regex:${rule.regex}`,
            };
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  }
}
