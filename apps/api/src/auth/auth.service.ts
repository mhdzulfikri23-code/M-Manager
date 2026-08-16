import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar. Masuk dengan akun tersebut.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create(dto.name.trim(), email, hashedPassword);
    return this.issueToken(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email atau kata sandi tidak cocok. Periksa lalu coba lagi.');
    }
    return this.issueToken(user.id, user.email, user.name);
  }

  private async issueToken(id: string, email: string, name: string) {
    const accessToken = await this.jwtService.signAsync({ sub: id, email });
    return { accessToken, user: { id, email, name } };
  }
}
