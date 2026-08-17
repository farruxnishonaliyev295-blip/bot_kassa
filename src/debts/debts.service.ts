import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // 💳 QARZ YARATISH
  // ============================================================

  async createDebt(
    userId: number,
    totalAmount: number,
    paidAmount: number,
    description: string,
  ) {
    const debtAmount =
      totalAmount - paidAmount;

    if (debtAmount <= 0) {
      return null;
    }

    return this.prisma.debt.create({
      data: {
        totalAmount,
        paidAmount,
        debtAmount,
        description,
        userId,
      },
    });
  }

  // ============================================================
  // 💳 BARCHA OCHIQ QARZLAR
  // ============================================================

  async getOpenDebts() {
    return this.prisma.debt.findMany({
      where: {
        debtAmount: {
          gt: 0,
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
  // 💳 BITTA QARZ
  // ============================================================

  async getDebtById(id: number) {
    return this.prisma.debt.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  }

  // ============================================================
  // 💵 QARZ TO‘LASH
  // ============================================================

  async payDebt(
    debtId: number,
    userId: number,
    amount: number,
  ) {
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

        const currentDebt =
          Number(debt.debtAmount);

        if (currentDebt <= 0) {
          throw new Error(
            "Bu qarz allaqachon yopilgan",
          );
        }

        if (amount <= 0) {
          throw new Error(
            "To‘lov summasi noto‘g‘ri",
          );
        }

        if (amount > currentDebt) {
          throw new Error(
            `To‘lov qarzdan katta bo‘lishi mumkin emas. Qarz: ${currentDebt}`,
          );
        }

        const newPaidAmount =
          Number(debt.paidAmount) +
          amount;

        const newDebtAmount =
          Number(debt.totalAmount) -
          newPaidAmount;

        // ------------------------------------
        // 💳 QARZNI YANGILASH
        // ------------------------------------

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

        // ------------------------------------
        // 💰 QARZ TO‘LOVINI KIRIMGA YOZISH
        // ------------------------------------

        await tx.transaction.create({
          data: {
            type: "INCOME",
            amount,
            description:
              `Qarz to‘lovi: ${debt.description}`,
            userId,
            debtId,
          },
        });

        return {
          debt: updatedDebt,
          paid: amount,
          remaining: newDebtAmount,
        };
      },
    );
  }
}