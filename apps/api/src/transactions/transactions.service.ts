import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, type?: TransactionType, month?: string, limit?: number) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(month ? { transactionDate: this.monthRange(month) } : {}),
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      ...(limit ? { take: Math.min(Math.max(limit, 1), 100) } : {}),
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan.');
    }
    return transaction;
  }

  create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        category: dto.category.trim(),
        description: dto.description.trim(),
        transactionDate: this.toDate(dto.transactionDate),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.transactionDate ? { transactionDate: this.toDate(dto.transactionDate) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    return { deleted: true };
  }

  async summary(userId: string, month?: string) {
    const selectedMonth = month ?? new Date().toISOString().slice(0, 7);
    const [allTotals, monthTotals] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId, transactionDate: this.monthRange(selectedMonth) },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = this.amountFor(allTotals, TransactionType.INCOME);
    const totalExpense = this.amountFor(allTotals, TransactionType.EXPENSE);
    return {
      balance: totalIncome - totalExpense,
      monthlyIncome: this.amountFor(monthTotals, TransactionType.INCOME),
      monthlyExpense: this.amountFor(monthTotals, TransactionType.EXPENSE),
    };
  }

  private amountFor(
    rows: { type: TransactionType; _sum: { amount: Prisma.Decimal | null } }[],
    type: TransactionType,
  ) {
    return Number(rows.find((row) => row.type === type)?._sum.amount ?? 0);
  }

  private monthRange(month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Format bulan harus YYYY-MM.');
    }
    const [year, monthNumber] = month.split('-').map(Number);
    return {
      gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
      lt: new Date(Date.UTC(year, monthNumber, 1)),
    };
  }

  private toDate(date: string) {
    return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  }
}
