import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, TransactionType } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('users/:id')
  findUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.findUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (id === currentUser.id && dto.role === Role.USER) {
      throw new BadRequestException('Anda tidak dapat menurunkan peran akun sendiri.');
    }
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  removeUser(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    if (id === currentUser.id) {
      throw new BadRequestException('Anda tidak dapat menghapus akun sendiri.');
    }
    return this.adminService.removeUser(id);
  }

  @Get('savings')
  savings() {
    return this.adminService.savings();
  }

  @Get('shared-savings')
  sharedSavings() {
    return this.adminService.sharedSavings();
  }

  @Get('transactions')
  listTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listTransactions({
      userId,
      type: type && Object.values(TransactionType).includes(type) ? type : undefined,
      month,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
