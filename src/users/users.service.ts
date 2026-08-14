import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: {
        telegramId,
      },
    });
  }

  async createUser(data: {
    telegramId: string;
    username?: string;
    firstName?: string;
    role: "ADMIN" | "CASHIER";
  }) {
    return this.prisma.user.upsert({
      where: {
        telegramId: data.telegramId,
      },
      update: {
        username: data.username,
        firstName: data.firstName,
        role: data.role,
      },
      create: {
        telegramId: data.telegramId,
        username: data.username,
        firstName: data.firstName,
        role: data.role,
      },
    });
  }
}