import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findAll(user.id);
  }

  @Get('candidates')
  candidates(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.candidates(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.groupsService.findOne(user.id, id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(user.id, id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.groupsService.removeMember(user.id, id, userId);
  }

  @Post(':id/deposits')
  deposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateDepositDto,
  ) {
    return this.groupsService.deposit(user.id, id, dto);
  }

  @Delete(':id')
  removeGroup(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.groupsService.removeGroup(user.id, id);
  }
}
