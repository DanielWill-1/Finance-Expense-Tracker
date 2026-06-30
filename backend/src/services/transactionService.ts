import { TransactionRepository } from '../repositories/transactionRepository';
import type { CreateTransactionInput, UpdateTransactionInput, TransactionFilterInput } from '../validators/transaction';
import type { PaginationParams, SortParams } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export class TransactionService {
  constructor(private transactionRepo: TransactionRepository) {}

  list(filter?: TransactionFilterInput, pagination?: PaginationParams, sort?: SortParams) {
    return this.transactionRepo.findAll(filter, pagination, sort);
  }

  getById(id: number) {
    const tx = this.transactionRepo.findById(id);
    if (!tx) throw new NotFoundError('Transaction', id);
    return tx;
  }

  create(input: CreateTransactionInput) {
    return this.transactionRepo.create(input);
  }

  update(id: number, input: UpdateTransactionInput) {
    const tx = this.transactionRepo.update(id, input);
    if (!tx) throw new NotFoundError('Transaction', id);
    return tx;
  }

  delete(id: number) {
    const deleted = this.transactionRepo.delete(id);
    if (!deleted) throw new NotFoundError('Transaction', id);
  }
}
