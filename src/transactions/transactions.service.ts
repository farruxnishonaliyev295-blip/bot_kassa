import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // KIRIM QO‘SHISH
  // ============================================================

  async createIncome(
    userId: number,
    amount: number,
    description: string,
  ) {
    return this.prisma.transaction.create({
      data: {
        type: "INCOME",
        amount,
        description,
        userId,
      },
    });
  }

  // ============================================================
  // XARAJAT QO‘SHISH
  // ============================================================

  async getSafeBalance() {
  const income =
    await this.prisma.transaction.aggregate({
      where: {
        type: "INCOME",
      },
      _sum: {
        amount: true,
      },
    });

  const expense =
    await this.prisma.transaction.aggregate({
      where: {
        type: "EXPENSE",
      },
      _sum: {
        amount: true,
      },
    });

  return {
    totalIncome:
      income._sum.amount ?? 0,

    totalExpense:
      expense._sum.amount ?? 0,
  };
}

  async createExpense(
    userId: number,
    amount: number,
    description: string,
  ) {
    return this.prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount,
        description,
        userId,
      },
    });
  }

  // ============================================================
  // HISOBOT
  // ============================================================

  async getReport(
    period: "today" | "month" | "year",
  ) {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    // ========================================================
    // BUGUN
    // ========================================================

    if (period === "today") {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );

      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
    }

    // ========================================================
    // OYLIK
    // ========================================================

    else if (period === "month") {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );

      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    // ========================================================
    // YILLIK
    // ========================================================

    else {
      startDate = new Date(
        now.getFullYear(),
        0,
        1,
        0,
        0,
        0,
        0,
      );

      endDate = new Date(
        now.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999,
      );
    }

    // ========================================================
    // TRANSACTIONLAR
    // ========================================================

    const transactions =
      await this.prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },

        include: {
          user: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    // ========================================================
    // JAMI KIRIM
    // ========================================================

    const income =
      await this.prisma.transaction.aggregate({
        where: {
          type: "INCOME",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },

        _sum: {
          amount: true,
        },
      });

    // ========================================================
    // JAMI XARAJAT
    // ========================================================

    const expense =
      await this.prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },

        _sum: {
          amount: true,
        },
      });

    // ========================================================
    // XODIMLAR BO‘YICHA
    // ========================================================

    const users = new Map<
      number,
      {
        username?: string | null;
        firstName?: string | null;
        income: number;
        expense: number;
      }
    >();

    for (const transaction of transactions) {
      const userId = transaction.userId;

      if (!users.has(userId)) {
        users.set(userId, {
          username: transaction.user?.username,
          firstName: transaction.user?.firstName,
          income: 0,
          expense: 0,
        });
      }

      const userData = users.get(userId)!;

      const amount = Number(transaction.amount);

      if (transaction.type === "INCOME") {
        userData.income += amount;
      }

      if (transaction.type === "EXPENSE") {
        userData.expense += amount;
      }
    }

    return {
      totalIncome: income._sum.amount ?? 0,

      totalExpense: expense._sum.amount ?? 0,

      users: Array.from(users.values()),

      transactions,
    };
  }
}