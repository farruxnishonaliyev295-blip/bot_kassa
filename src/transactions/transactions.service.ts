import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, TransactionType } from "@prisma/client";

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // 💰 KIRIM
  // ============================================================

  async createIncome(
    userId: number,
    amount: number,
    description: string,
  ) {
    return this.prisma.transaction.create({
      data: {
        type: TransactionType.INCOME,
        amount: new Prisma.Decimal(amount),
        description,
        userId,
      },
    });
  }

  // ============================================================
  // 💸 ODDIY XARAJAT
  // ============================================================

  async createExpense(
    userId: number,
    amount: number,
    description: string,
  ) {
    return this.prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: new Prisma.Decimal(amount),
        description,
        userId,
      },
    });
  }

  // ============================================================
  // 💳 QARZGA XARAJAT
  // ============================================================

  async createDebtExpense(
    userId: number,
    amount: number,
    description: string,
  ) {
    const decimalAmount =
      new Prisma.Decimal(amount);

    return this.prisma.$transaction(
      async (tx) => {
        // Qarz yaratamiz
        const debt =
          await tx.debt.create({
            data: {
              totalAmount: decimalAmount,
              paidAmount:
                new Prisma.Decimal(0),
              debtAmount: decimalAmount,
              description,
              userId,
            },
          });

        // Qarzga bog‘langan xarajat
        const transaction =
          await tx.transaction.create({
            data: {
              type: TransactionType.EXPENSE,
              amount: decimalAmount,
              description,
              userId,
              debtId: debt.id,
            },
            include: {
              debt: true,
            },
          });

        return {
          transaction,
          debt,
        };
      },
    );
  }

  // ============================================================
  // 💳 OCHIQ QARZLAR
  // ============================================================

  async getOpenDebts() {
    return this.prisma.debt.findMany({
      where: {
        debtAmount: {
          gt: new Prisma.Decimal(0),
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // ============================================================
  // 💳 BIRTA QARZ
  // ============================================================

  async getDebtById(
    debtId: number,
  ) {
    return this.prisma.debt.findUnique({
      where: {
        id: debtId,
      },
      include: {
        user: true,
        transactions: true,
      },
    });
  }

  // ============================================================
  // 💵 QARZ TO‘LASH
  // ============================================================

  async payDebt(
    debtId: number,
    amount: number,
    userId: number,
  ) {
    const payment =
      new Prisma.Decimal(amount);

    return this.prisma.$transaction(
      async (tx) => {
        const debt =
          await tx.debt.findUnique({
            where: {
              id: debtId,
            },
          });

        if (!debt) {
          throw new Error(
            "Qarz topilmadi",
          );
        }

        const remaining =
          new Prisma.Decimal(
            debt.debtAmount,
          );

        if (
          payment.gt(remaining)
        ) {
          throw new Error(
            `To‘lov qarzdan katta. Qolgan qarz: ${remaining.toString()}`,
          );
        }

        const newPaidAmount =
          new Prisma.Decimal(
            debt.paidAmount,
          ).plus(payment);

        const newDebtAmount =
          new Prisma.Decimal(
            debt.debtAmount,
          ).minus(payment);

        const updatedDebt =
          await tx.debt.update({
            where: {
              id: debtId,
            },
            data: {
              paidAmount:
                newPaidAmount,
              debtAmount:
                newDebtAmount,
            },
          });

        // Qarz to‘lovi KIRIM sifatida yoziladi
        const transaction =
          await tx.transaction.create({
            data: {
              type: TransactionType.INCOME,
              amount: payment,
              description:
                `Qarz to‘lovi: ${debt.description}`,
              userId,
              debtId,
            },
          });

        return {
          debt: updatedDebt,
          transaction,
        };
      },
    );
  }

  // ============================================================
  // 💳 QARZLAR UMUMIY SUMMASI
  // ============================================================

  async getTotalDebt() {
    const result =
      await this.prisma.debt.aggregate({
        _sum: {
          debtAmount: true,
        },
        where: {
          debtAmount: {
            gt: new Prisma.Decimal(0),
          },
        },
      });

    return result._sum.debtAmount ?? 0;
  }

  // ============================================================
  // 🔐 SEYF
  // ============================================================

  async getSafeBalance() {
    const income =
      await this.prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: TransactionType.INCOME,
        },
      });

    const expense =
      await this.prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: TransactionType.EXPENSE,
        },
      });

    return {
      totalIncome:
        income._sum.amount ?? 0,

      totalExpense:
        expense._sum.amount ?? 0,
    };
  }

  // ============================================================
  // 📊 HISOBOT
  // ============================================================

  async getReport(
    period:
      | "today"
      | "month"
      | "year",
  ) {
    const now = new Date();

    let startDate: Date;

    if (period === "today") {
      startDate =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
    } else if (
      period === "month"
    ) {
      startDate =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );
    } else {
      startDate =
        new Date(
          now.getFullYear(),
          0,
          1,
        );
    }

    const transactions =
      await this.prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          user: true,
          debt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    let totalIncome =
      new Prisma.Decimal(0);

    let totalExpense =
      new Prisma.Decimal(0);

    for (
      const transaction of transactions
    ) {
      if (
        transaction.type ===
        TransactionType.INCOME
      ) {
        totalIncome =
          totalIncome.plus(
            transaction.amount,
          );
      } else {
        totalExpense =
          totalExpense.plus(
            transaction.amount,
          );
      }
    }

    // ==========================================================
    // 👥 XODIMLAR
    // ==========================================================

    const usersMap =
      new Map<
        number,
        {
          username: string | null;
          firstName: string | null;
          income: number;
          expense: number;
        }
      >();

    for (
      const transaction of transactions
    ) {
      const user =
        transaction.user;

      if (!usersMap.has(user.id)) {
        usersMap.set(user.id, {
          username:
            user.username,
          firstName:
            user.firstName,
          income: 0,
          expense: 0,
        });
      }

      const item =
        usersMap.get(user.id)!;

      if (
        transaction.type ===
        TransactionType.INCOME
      ) {
        item.income += Number(
          transaction.amount,
        );
      } else {
        item.expense += Number(
          transaction.amount,
        );
      }
    }

    return {
      totalIncome,
      totalExpense,

      users:
        Array.from(
          usersMap.values(),
        ),

      transactions,
    };
  }

  // ============================================================
  // 💳 QARZLAR HISOBOTI
  // ============================================================

  async getDebtReport() {
    const debts =
      await this.prisma.debt.findMany({
        where: {
          debtAmount: {
            gt: new Prisma.Decimal(0),
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    let totalDebt =
      new Prisma.Decimal(0);

    for (const debt of debts) {
      totalDebt =
        totalDebt.plus(
          debt.debtAmount,
        );
    }

    return {
      debts,
      totalDebt,
    };
  }
}