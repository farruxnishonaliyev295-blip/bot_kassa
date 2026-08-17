import { Module } from "@nestjs/common";
import { DebtsService } from "./debts.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [
    DebtsService,
    PrismaService,
  ],
  exports: [
    DebtsService,
  ],
})
export class DebtsModule {}
