import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
  }

  create(name: string, username: string, email: string, password: string) {
    return this.prisma.user.create({ data: { name, username, email, password } });
  }
}
