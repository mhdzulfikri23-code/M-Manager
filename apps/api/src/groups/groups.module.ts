import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, RolesGuard],
})
export class GroupsModule {}
