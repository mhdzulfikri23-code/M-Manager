import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar. Masuk dengan akun tersebut.');
    }

    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username sudah digunakan. Pilih username lain.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.usersService.create(username, username, email, hashedPassword);
      return this.issueToken(user.id, user.email, user.username, user.name, user.role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const fields = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
        throw new ConflictException(fields.includes('email')
          ? 'Email sudah terdaftar. Gunakan email lain atau masuk ke akun tersebut.'
          : 'Username sudah digunakan. Pilih username lain.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const identifier = dto.email.trim();
    const user = identifier.includes('@')
      ? await this.usersService.findByEmail(identifier.toLowerCase())
      : await this.usersService.findByUsername(identifier);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Username/email atau kata sandi tidak cocok. Periksa lalu coba lagi.');
    }
    return this.issueToken(user.id, user.email, user.username, user.name, user.role);
  }

  private async issueToken(id: string, email: string, username: string, name: string, role: Role) {
    const accessToken = await this.jwtService.signAsync({ sub: id, email, role });
    return { accessToken, user: { id, email, username, name, role } };
  }
}
