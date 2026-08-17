import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totals = await this.prisma.transaction.groupBy({
      by: ['userId', 'type'],
      _sum: { amount: true },
    });

    return users.map((user) => {
      const income = this.amountFor(totals, user.id, TransactionType.INCOME);
      const expense = this.amountFor(totals, user.id, TransactionType.EXPENSE);
      return { ...user, income, expense, balance: income - expense };
    });
  }

  async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        transactions: { orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }] },
      },
    });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    const username = dto.username?.trim();
    if (username && username !== existing.username) {
      const usernameOwner = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (usernameOwner && usernameOwner.id !== id) {
        throw new ConflictException('Username sudah digunakan oleh akun lain.');
      }
    }
    const email = dto.email?.trim().toLowerCase();
    if (email && email !== existing.email) {
      const emailOwner = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (emailOwner && emailOwner.id !== id) {
        throw new ConflictException('Email sudah digunakan oleh akun lain.');
      }
    }
    const password = dto.password ? await bcrypt.hash(dto.password, 12) : undefined;
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(username !== undefined ? { username, name: username } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(password !== undefined ? { password } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
        },
        select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, updatedAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const fields = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
        throw new ConflictException(fields.includes('email')
          ? 'Email sudah digunakan oleh akun lain.'
          : 'Username sudah digunakan oleh akun lain.');
      }
      throw error;
    }
  }

  async removeUser(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async savings() {
    const users = await this.prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const totals = await this.prisma.transaction.groupBy({
      by: ['userId', 'type'],
      _sum: { amount: true },
    });

    return users.map((user) => {
      const income = this.amountFor(totals, user.id, TransactionType.INCOME);
      const expense = this.amountFor(totals, user.id, TransactionType.EXPENSE);
      return {
        userId: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        income,
        expense,
        balance: income - expense,
      };
    });
  }

  async sharedSavings() {
    const groups = await this.prisma.savingsGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        deposits: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return groups.map((group) => {
      const totals = new Map<string, number>();
      for (const deposit of group.deposits) {
        totals.set(deposit.userId, (totals.get(deposit.userId) ?? 0) + Number(deposit.amount));
      }

      return {
        id: group.id,
        name: group.name,
        goal: group.goal ? Number(group.goal) : null,
        createdById: group.createdById,
        createdAt: group.createdAt,
        totalDeposited: [...totals.values()].reduce((sum, amount) => sum + amount, 0),
        members: group.members.map((member) => ({
          userId: member.user.id,
          name: member.user.name,
          email: member.user.email,
          total: totals.get(member.user.id) ?? 0,
          joinedAt: member.createdAt,
        })),
        deposits: group.deposits.map((deposit) => ({
          id: deposit.id,
          userId: deposit.user.id,
          name: deposit.user.name,
          email: deposit.user.email,
          amount: Number(deposit.amount),
          note: deposit.note,
          createdAt: deposit.createdAt,
        })),
      };
    });
  }

  listTransactions(options: { userId?: string; type?: TransactionType; month?: string; limit?: number }) {
    return this.prisma.transaction.findMany({
      where: {
        ...(options.userId ? { userId: options.userId } : {}),
        ...(options.type ? { type: options.type } : {}),
        ...(options.month ? { transactionDate: this.monthRange(options.month) } : {}),
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      ...(options.limit ? { take: Math.min(Math.max(options.limit, 1), 100) } : {}),
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  private amountFor(
    rows: { userId: string; type: TransactionType; _sum: { amount: Prisma.Decimal | null } }[],
    userId: string,
    type: TransactionType,
  ) {
    const row = rows.find((r) => r.userId === userId && r.type === type);
    return Number(row?._sum.amount ?? 0);
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
}
