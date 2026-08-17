import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, RolesGuard],
})
export class TransactionsModule {}
