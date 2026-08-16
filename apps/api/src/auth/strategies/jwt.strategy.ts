import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'development-only-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findPublicById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Sesi tidak valid. Silakan masuk kembali.');
    }
    return { id: user.id, email: user.email };
  }
}
