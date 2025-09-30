import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../logger/index.js';
import { TransactionRecord, TransactionState, TransactionType } from '../../types/wallet.js';

const prisma = new PrismaClient();

export class PrismaTransactionService {
  private logger = createLogger('transaction-service');

  /**
   * Map database transaction to TransactionRecord
   * Handles field name differences between orchestrator schema (status, from, to, hash) 
   * and midnight-mcp interface (state, fromAddress, toAddress, txIdentifier)
   */
  private mapToTransactionRecord(tx: any): TransactionRecord {
    return {
      id: tx.id,
      state: tx.status as TransactionState,  // DB uses 'status', interface uses 'state'
      type: tx.type as TransactionType,
      fromAddress: tx.from,  // DB uses 'from', interface uses 'fromAddress'
      toAddress: tx.to,      // DB uses 'to', interface uses 'toAddress'
      amount: tx.amount,
      txIdentifier: tx.hash, // DB uses 'hash', interface uses 'txIdentifier'
      errorMessage: tx.errorMessage,
      metadata: tx.metadata ? JSON.parse(tx.metadata) : undefined,
      createdAt: tx.createdAt.getTime(),
      updatedAt: tx.updatedAt.getTime()
    };
  }

  async createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
    type: TransactionType = TransactionType.TRANSFER,
    metadata?: Record<string, any>
  ): Promise<TransactionRecord> {
    try {
      const transaction = await (prisma as any).transaction.create({
        data: {
          id: uuidv4(),
          status: TransactionState.INITIATED,  // Use 'status' not 'state' to match schema
          type,
          from: fromAddress,  // Use 'from' not 'fromAddress' to match schema
          to: toAddress,      // Use 'to' not 'toAddress' to match schema
          amount,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      this.logger.info(`Created transaction record: ${transaction.id} (type: ${type})`);
      return this.mapToTransactionRecord(transaction);
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
          status: TransactionState.SENT,  // Use 'status' not 'state'
          hash: txIdentifier,              // Use 'hash' not 'txIdentifier'
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Updated transaction ${id} to SENT with txIdentifier ${txIdentifier}`);
      return this.mapToTransactionRecord(transaction);
    } catch (error) {
      this.logger.error(`Failed to update transaction ${id} to SENT`, error);
      return null;
    }
  }

  async markTransactionAsCompleted(txIdentifier: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.update({
        where: { hash: txIdentifier },  // Use 'hash' not 'txIdentifier'
        data: {
          status: TransactionState.COMPLETED,  // Use 'status' not 'state'
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Marked transaction with txIdentifier ${txIdentifier} as COMPLETED`);
      return this.mapToTransactionRecord(transaction);
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
          status: TransactionState.FAILED,  // Use 'status' not 'state'
          errorMessage,
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Marked transaction ${id} as FAILED: ${errorMessage}`);
      return this.mapToTransactionRecord(transaction);
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
      return transaction ? this.mapToTransactionRecord(transaction) : null;
    } catch (error) {
      this.logger.error(`Failed to get transaction with ID: ${id}`, error);
      throw error;
    }
  }

  async getTransactionByTxIdentifier(txIdentifier: string): Promise<TransactionRecord | null> {
    try {
      const transaction = await (prisma as any).transaction.findUnique({
        where: { hash: txIdentifier },  // Use 'hash' not 'txIdentifier'
      });
      return transaction ? this.mapToTransactionRecord(transaction) : null;
    } catch (error) {
      this.logger.error(`Failed to get transaction with txIdentifier: ${txIdentifier}`, error);
      throw error;
    }
  }

  async getTransactionsByState(state: TransactionState): Promise<TransactionRecord[]> {
    try {
      const transactions = await (prisma as any).transaction.findMany({
        where: { status: state },  // Use 'status' not 'state'
        orderBy: { updatedAt: 'desc' },
      });
      return transactions.map((tx: any) => this.mapToTransactionRecord(tx));
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
      return transactions.map((tx: any) => this.mapToTransactionRecord(tx));
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
            { status: TransactionState.INITIATED },  // Use 'status' not 'state'
            { status: TransactionState.SENT },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
      return transactions.map((tx: any) => this.mapToTransactionRecord(tx));
    } catch (error) {
      this.logger.error('Failed to get pending transactions', error);
      throw error;
    }
  }
}

export default PrismaTransactionService;