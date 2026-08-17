import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { BotService } from "./bot.service";
import { UsersModule } from "../users/users.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { DebtsModule } from "../debts/debts.module";

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    TransactionsModule,
    DebtsModule,
  ],
  providers: [
    BotService,
  ],
})
export class BotModule {}