import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { UsersModule } from "../users/users.module";
import { TransactionsModule } from "../transactions/transactions.module";

@Module({
  imports: [
    UsersModule,
    TransactionsModule,
  ],
  providers: [BotService],
})
export class BotModule {}