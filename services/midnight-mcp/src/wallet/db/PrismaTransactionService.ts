import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../logger/index.js';
import { TransactionRecord, TransactionState } from '../../types/wallet.js';

const prisma = new PrismaClient().$extends(withAccelerate());

export class PrismaTransactionService {
  private logger = createLogger('transaction-service');

  async createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionRecord> {
    try {
      const transaction = await (prisma as any).transaction.create({
        data: {
          id: uuidv4(),
          state: TransactionState.INITIATED,
          fromAddress,
          toAddress,
          amount,
        },
      });

      this.logger.info(`Created transaction record: ${transaction.id}`);
      return {
        ...transaction,
        state: transaction.state as TransactionState,
        createdAt: transaction.createdAt.getTime(),
        updatedAt: transaction.updatedAt.getTime()
      } as TransactionRecord;
    } catch (error) {
      this.logger.error('Failed to create transaction record', error);
      throw error;
    }
  }

  async markTransactionAsSent(id: string, txIdentifier: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.update({
        where: { id },
        data: {
          state: TransactionState.SENT,
          txIdentifier,
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Updated transaction ${id} to SENT with txIdentifier ${txIdentifier}`);
      return {
        ...transaction,
        state: transaction.state as TransactionState,
        createdAt: transaction.createdAt.getTime(),
        updatedAt: transaction.updatedAt.getTime()
      } as TransactionRecord;
    } catch (error) {
      this.logger.error(`Failed to update transaction ${id} to SENT`, error);
      return null;
    }
  }

  async markTransactionAsCompleted(txIdentifier: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.update({
        where: { txIdentifier },
        data: {
          state: TransactionState.COMPLETED,
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Marked transaction with txIdentifier ${txIdentifier} as COMPLETED`);
      return {
        ...transaction,
        state: transaction.state as TransactionState,
        createdAt: transaction.createdAt.getTime(),
        updatedAt: transaction.updatedAt.getTime()
      } as TransactionRecord;
    } catch (error) {
      this.logger.error(`Failed to mark transaction ${txIdentifier} as COMPLETED`, error);
      return null;
    }
  }

  async markTransactionAsFailed(id: string, errorMessage: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.update({
        where: { id },
        data: {
          state: TransactionState.FAILED,
          errorMessage,
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Marked transaction ${id} as FAILED: ${errorMessage}`);
      return {
        ...transaction,
        state: transaction.state as TransactionState,
        createdAt: transaction.createdAt.getTime(),
        updatedAt: transaction.updatedAt.getTime()
      } as TransactionRecord;
    } catch (error) {
      this.logger.error(`Failed to mark transaction ${id} as FAILED`, error);
      return null;
    }
  }

  async getTransactionById(id: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.findUnique({
        where: { id },
      });
      return transaction ? {
        ...transaction,
        state: transaction.state as TransactionState,
        createdAt: transaction.createdAt.getTime(),
        updatedAt: transaction.updatedAt.getTime()
      } as TransactionRecord : null;
    } catch (error) {
      this.logger.error(`Failed to get transaction with ID: ${id}`, error);
      throw error;
    }
  }

  async getTransactionByTxIdentifier(txIdentifier: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.findUnique({
        where: { txIdentifier },
      });
      return transaction ? {
        ...transaction,
        state: transaction.state as TransactionState,
        createdAt: transaction.createdAt.getTime(),
        updatedAt: transaction.updatedAt.getTime()
      } as TransactionRecord : null;
    } catch (error) {
      this.logger.error(`Failed to get transaction with txIdentifier: ${txIdentifier}`, error);
      throw error;
    }
  }

  async getTransactionsByState(state: TransactionState): Promise<TransactionRecord[]> {
    try {
      const transactions = await (prisma as any).transaction.findMany({
        where: { state },
        orderBy: { updatedAt: 'desc' },
      });
      return transactions.map((tx: any) => ({
        ...tx,
        state: tx.state as TransactionState,
        createdAt: tx.createdAt.getTime(),
        updatedAt: tx.updatedAt.getTime()
      })) as TransactionRecord[];
    } catch (error) {
      this.logger.error(`Failed to get transactions with state: ${state}`, error);
      throw error;
    }
  }

  async getAllTransactions(): Promise<TransactionRecord[]> {
    try {
      const transactions = await (prisma as any).transaction.findMany({
        orderBy: { updatedAt: 'desc' },
      });
      return transactions.map((tx: any) => ({
        ...tx,
        state: tx.state as TransactionState,
        createdAt: tx.createdAt.getTime(),
        updatedAt: tx.updatedAt.getTime()
      })) as TransactionRecord[];
    } catch (error) {
      this.logger.error('Failed to get all transactions', error);
      throw error;
    }
  }

  async getPendingTransactions(): Promise<TransactionRecord[]> {
    try {
      const transactions = await (prisma as any).transaction.findMany({
        where: {
          OR: [
            { state: TransactionState.INITIATED },
            { state: TransactionState.SENT },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
      return transactions.map((tx: any) => ({
        ...tx,
        state: tx.state as TransactionState,
        createdAt: tx.createdAt.getTime(),
        updatedAt: tx.updatedAt.getTime()
      })) as TransactionRecord[];
    } catch (error) {
      this.logger.error('Failed to get pending transactions', error);
      throw error;
    }
  }
}

export default PrismaTransactionService;