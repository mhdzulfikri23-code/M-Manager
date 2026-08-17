import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateGroupDto } from './dto/create-group.dto';

const memberUserSelect = { select: { id: true, name: true, email: true } } as const;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGroupDto) {
    const partnerEmail = dto.partnerEmail?.trim().toLowerCase();
    const creator = partnerEmail
      ? await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      : null;
    if (partnerEmail && partnerEmail === creator?.email) {
      throw new BadRequestException('Email partner harus berbeda dari email Anda.');
    }

    const partner = partnerEmail
      ? await this.prisma.user.findUnique({ where: { email: partnerEmail }, select: { id: true } })
      : null;
    if (partnerEmail && !partner) {
      throw new NotFoundException('Partner belum terdaftar. Minta partner membuat akun terlebih dahulu.');
    }

    return this.prisma.savingsGroup.create({
      data: {
        name: dto.name.trim(),
        ...(dto.goal !== undefined ? { goal: new Prisma.Decimal(dto.goal) } : {}),
        createdById: userId,
        members: { create: [{ userId }, ...(partner ? [{ userId: partner.id }] : [])] },
        ...(dto.initialAmount !== undefined
          ? {
              deposits: {
                create: {
                  userId,
                  amount: new Prisma.Decimal(dto.initialAmount),
                  ...(dto.initialNote ? { note: dto.initialNote.trim() } : {}),
                },
              },
            }
          : {}),
      },
      include: { members: { include: { user: memberUserSelect }, orderBy: { createdAt: 'asc' } } },
    });
  }

  async findAll(userId: string) {
    const groups = await this.prisma.savingsGroup.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, deposits: true } },
        deposits: { select: { amount: true, userId: true } },
      },
    });

    return groups.map((group) => {
      const total = group.deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
      const mine = group.deposits
        .filter((deposit) => deposit.userId === userId)
        .reduce((sum, deposit) => sum + Number(deposit.amount), 0);
      return {
        id: group.id,
        name: group.name,
        goal: group.goal ? Number(group.goal) : null,
        createdAt: group.createdAt,
        memberCount: group._count.members,
        depositCount: group._count.deposits,
        totalDeposited: total,
        myDeposited: mine,
      };
    });
  }

  candidates(userId: string) {
    return this.prisma.user.findMany({
      where: { id: { not: userId }, role: Role.USER },
      select: { id: true, name: true, username: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
  }

  async findOne(userId: string, groupId: string) {
    const group = await this.prisma.savingsGroup.findFirst({
      where: { id: groupId, members: { some: { userId } } },
      include: {
        members: { include: { user: memberUserSelect }, orderBy: { createdAt: 'asc' } },
        deposits: { include: { user: memberUserSelect }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!group) {
      throw new NotFoundException('Grup tabungan tidak ditemukan.');
    }

    const totals = new Map<string, number>();
    for (const deposit of group.deposits) {
      totals.set(deposit.userId, (totals.get(deposit.userId) ?? 0) + Number(deposit.amount));
    }
    const totalDeposited = [...totals.values()].reduce((sum, value) => sum + value, 0);

    return {
      id: group.id,
      name: group.name,
      goal: group.goal ? Number(group.goal) : null,
      createdById: group.createdById,
      createdAt: group.createdAt,
      totalDeposited,
      members: group.members.map((member) => ({
        id: member.id,
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
        amount: Number(deposit.amount),
        note: deposit.note,
        createdAt: deposit.createdAt,
      })),
    };
  }

  async addMember(userId: string, groupId: string, dto: AddMemberDto) {
    const group = await this.requireMember(groupId, userId);
    if (group.createdById !== userId) {
      throw new ForbiddenException('Hanya pemilik tabungan yang dapat menambah partner.');
    }

    const email = dto.email.trim().toLowerCase();
    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target) {
      throw new NotFoundException('Pengguna dengan email tersebut tidak ditemukan.');
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: target.id } },
    });
    if (existing) {
      throw new BadRequestException('Pengguna sudah menjadi anggota grup ini.');
    }

    await this.prisma.groupMember.create({ data: { groupId, userId: target.id } });
    return this.findOne(userId, groupId);
  }

  async removeMember(userId: string, groupId: string, targetUserId: string) {
    const group = await this.prisma.savingsGroup.findFirst({
      where: { id: groupId, members: { some: { userId } } },
    });
    if (!group) {
      throw new NotFoundException('Grup tabungan tidak ditemukan.');
    }

    const isOwner = group.createdById === userId;
    if (!isOwner && targetUserId !== userId) {
      throw new ForbiddenException('Hanya pemilik grup yang dapat menghapus anggota lain.');
    }
    if (group.createdById === targetUserId) {
      throw new ForbiddenException('Pemilik grup tidak dapat dikeluarkan. Hapus grup jika ingin menutup tabungan.');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('Anggota tidak ditemukan di grup ini.');
    }

    await this.prisma.groupMember.delete({ where: { id: membership.id } });
    return { removed: true };
  }

  async deposit(userId: string, groupId: string, dto: CreateDepositDto) {
    await this.requireMember(groupId, userId);

    const deposit = await this.prisma.groupDeposit.create({
      data: {
        groupId,
        userId,
        amount: new Prisma.Decimal(dto.amount),
        ...(dto.note ? { note: dto.note.trim() } : {}),
      },
      include: { user: memberUserSelect },
    });

    return {
      id: deposit.id,
      userId: deposit.user.id,
      name: deposit.user.name,
      amount: Number(deposit.amount),
      note: deposit.note,
      createdAt: deposit.createdAt,
    };
  }

  async removeGroup(userId: string, groupId: string) {
    const group = await this.prisma.savingsGroup.findFirst({
      where: { id: groupId, members: { some: { userId } } },
    });
    if (!group) {
      throw new NotFoundException('Grup tabungan tidak ditemukan.');
    }
    if (group.createdById !== userId) {
      throw new ForbiddenException('Hanya pemilik grup yang dapat menghapus grup.');
    }

    await this.prisma.savingsGroup.delete({ where: { id: groupId } });
    return { deleted: true };
  }

  private async requireMember(groupId: string, userId: string) {
    const group = await this.prisma.savingsGroup.findFirst({
      where: { id: groupId, members: { some: { userId } } },
    });
    if (!group) {
      throw new NotFoundException('Grup tabungan tidak ditemukan.');
    }
    return group;
  }
}
