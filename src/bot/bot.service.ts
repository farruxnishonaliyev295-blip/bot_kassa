import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf, Markup } from "telegraf";

import { UsersService } from "../users/users.service";
import { TransactionsService } from "../transactions/transactions.service";
import { DebtsService } from "../debts/debts.service";

@Injectable()
export class BotService
  implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;

  // ============================================================
  // 💰 KIRIM HOLATI
  // ============================================================

  private incomeState = new Map<
    number,
    {
      step: "amount" | "description";
      amount?: number;
    }
  >();

  // ============================================================
  // 💸 XARAJAT HOLATI
  // ============================================================

  private expenseState = new Map<
    number,
    {
      step:
      | "amount"
      | "paidAmount"
      | "description";
      amount?: number;
      paidAmount?: number;
    }
  >();

  // ============================================================
  // 💵 QARZ TO‘LOVI HOLATI
  // ============================================================

  private debtPaymentState = new Map<
    number,
    {
      debtId: number;
      maxAmount: number;
    }
  >();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
    private readonly debtsService: DebtsService,
  ) {
    const token =
      this.configService.get<string>(
        "BOT_TOKEN",
      );

    if (!token) {
      throw new Error(
        "BOT_TOKEN .env faylda topilmadi",
      );
    }

    this.bot = new Telegraf(token);
  }

  // ============================================================
  // BOT ISHGA TUSHISHI
  // ============================================================

  async onModuleInit() {
    // ==========================================================
    // /START
    // ==========================================================

    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    // ==========================================================
    // 💰 KIRIM
    // ==========================================================

    this.bot.hears(
      "💰 Kirim",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        // Boshqa jarayonlarni tozalash
        this.expenseState.delete(
          ctx.from.id,
        );

        this.debtPaymentState.delete(
          ctx.from.id,
        );

        this.incomeState.set(
          ctx.from.id,
          {
            step: "amount",
          },
        );

        await ctx.reply(
          "💰 KIRIM\n\n" +
          "Kirim summasini kiriting:\n\n" +
          "Masalan:\n" +
          "500000",
        );
      },
    );

    // ==========================================================
    // 💸 XARAJAT
    // ==========================================================

    this.bot.hears(
      "💸 Xarajat",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        // Boshqa jarayonlarni tozalash
        this.incomeState.delete(
          ctx.from.id,
        );

        this.debtPaymentState.delete(
          ctx.from.id,
        );

        this.expenseState.set(
          ctx.from.id,
          {
            step: "amount",
          },
        );

        await ctx.reply(
          "💸 XARAJAT\n\n" +
          "Jami xarajat summasini kiriting:\n\n" +
          "Masalan:\n" +
          "100000",
        );
      },
    );

    // ==========================================================
    // 📊 HISOBOT
    // ==========================================================

    this.bot.hears(
      "📊 Hisobot",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        this.clearStates(
          ctx.from.id,
        );

        await ctx.reply(
          "📊 HISOBOT\n\n" +
          "Qaysi hisobotni ko‘rmoqchisiz?",
          this.getReportKeyboard(),
        );
      },
    );

    // ==========================================================
    // 📅 BUGUNGI HISOBOT
    // ==========================================================

    this.bot.hears(
      "📅 Bugun",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        const report =
          await this.transactionsService.getReport(
            "today",
          );

        await this.sendReport(
          ctx,
          report,
          "📅 BUGUNGI HISOBOT",
        );
      },
    );

    // ==========================================================
    // 📆 OYLIK HISOBOT
    // ==========================================================

    this.bot.hears(
      "📆 Oylik",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        const report =
          await this.transactionsService.getReport(
            "month",
          );

        await this.sendReport(
          ctx,
          report,
          "📆 OYLIK HISOBOT",
        );
      },
    );

    // ==========================================================
    // 🗓 YILLIK HISOBOT
    // ==========================================================

    this.bot.hears(
      "🗓 Yillik",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        const report =
          await this.transactionsService.getReport(
            "year",
          );

        await this.sendReport(
          ctx,
          report,
          "🗓 YILLIK HISOBOT",
        );
      },
    );

    // ==========================================================
    // 💳 QARZLAR
    // ==========================================================

    this.bot.hears(
      "💳 Qarzlar",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        this.clearStates(
          ctx.from.id,
        );

        const debts =
          await this.debtsService.getOpenDebts();

        if (!debts.length) {
          await ctx.reply(
            "💳 QARZLAR\n\n" +
            "✅ Hozircha ochiq qarzlar yo‘q.",
            this.getReportKeyboard(),
          );

          return;
        }

        let totalDebt = 0;

        for (const debt of debts) {
          const debtAmount =
            Number(
              debt.debtAmount,
            );

          totalDebt +=
            debtAmount;

          const employee =
            debt.user?.username
              ? `@${debt.user.username}`
              : debt.user?.firstName ||
              "Noma'lum";

          const message =
            "💳 QARZ\n\n" +
            `📝 Sabab: ${debt.description}\n` +
            `💳 Qarz: ${this.formatMoney(
              debtAmount,
            )} so‘m\n` +
            `👤 Xodim: ${employee}\n` +
            `📅 Sana: ${this.formatDate(
              debt.createdAt,
            )}`;

          await ctx.reply(
            message,
            Markup.inlineKeyboard([
              Markup.button.callback(
                "💵 To‘lash",
                `PAY_DEBT_${debt.id}`,
              ),
            ]),
          );
        }

        await ctx.reply(
          "💳 QARZLAR JAMI\n\n" +
          `💳 Jami qarz: ${this.formatMoney(
            totalDebt,
          )} so‘m`,
          this.getReportKeyboard(),
        );
      },
    );

    // ==========================================================
    // 💵 QARZ TO‘LASH BUTTON
    // ==========================================================

    this.bot.action(
      /^PAY_DEBT_(\d+)$/,
      async (ctx) => {
        const debtId =
          Number(
            (ctx as any).match[1],
          );

        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.answerCbQuery();

          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        const debt =
          await this.debtsService.getDebtById(
            debtId,
          );

        if (!debt) {
          await ctx.answerCbQuery();

          await ctx.reply(
            "❌ Qarz topilmadi.",
          );

          return;
        }

        const remaining =
          Number(
            debt.debtAmount,
          );

        if (remaining <= 0) {
          await ctx.answerCbQuery();

          await ctx.reply(
            "✅ Bu qarz allaqachon yopilgan.",
          );

          return;
        }

        this.incomeState.delete(
          ctx.from.id,
        );

        this.expenseState.delete(
          ctx.from.id,
        );

        this.debtPaymentState.set(
          ctx.from.id,
          {
            debtId,
            maxAmount: remaining,
          },
        );

        await ctx.answerCbQuery();

        await ctx.reply(
          "💵 QARZ TO‘LOVI\n\n" +
          `📝 Sabab: ${debt.description}\n` +
          `💳 Qolgan qarz: ${this.formatMoney(
            remaining,
          )} so‘m\n\n` +
          "Qancha to‘laysiz?\n\n" +
          "Masalan:\n" +
          `${remaining}`,
        );
      },
    );

    // ==========================================================
    // 🔐 SEYF
    // ==========================================================

    this.bot.hears(
      "🔐 Seyf",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        this.clearStates(
          ctx.from.id,
        );

        const safe =
          await this.transactionsService.getSafeBalance();

        const totalIncome =
          Number(
            safe.totalIncome || 0,
          );

        const totalExpense =
          Number(
            safe.totalExpense || 0,
          );

        const balance =
          totalIncome -
          totalExpense;

        let balanceText = "";

        if (balance > 0) {
          balanceText =
            `💵 SEYFDA QOLGAN: ${this.formatMoney(
              balance,
            )} so‘m`;
        } else if (
          balance === 0
        ) {
          balanceText =
            "💵 SEYFDA QOLGAN: 0 so‘m";
        } else {
          balanceText =
            `🔴 SEYF QARZDOR: ${this.formatMoney(
              Math.abs(balance),
            )} so‘m`;
        }

        await ctx.reply(
          "🔐 SEYF\n\n" +
          `💰 Jami kirim: ${this.formatMoney(
            totalIncome,
          )} so‘m\n` +
          `💸 Jami xarajat: ${this.formatMoney(
            totalExpense,
          )} so‘m\n` +
          "➖➖➖➖➖➖➖\n" +
          `${balanceText}\n\n` +
          "🏦 Antiqa Kassa\n\n" +
          "Kerakli bo‘limni tanlang 👇",
          this.getMainKeyboard(),
        );
      },
    );

    // ==========================================================
    // ⬅️ ORQAGA
    // ==========================================================

    this.bot.hears(
      "⬅️ Orqaga",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        this.clearStates(
          ctx.from.id,
        );

        await ctx.reply(
          "🏦 Antiqa Kassa\n\n" +
          "Kerakli bo‘limni tanlang 👇",
          this.getMainKeyboard(),
        );
      },
    );

    // ==========================================================
    // 📝 TEXT XABARLAR
    // ==========================================================

    this.bot.on(
      "text",
      async (ctx) => {
        const telegramId =
          String(ctx.from.id);

        const user =
          await this.usersService.findByTelegramId(
            telegramId,
          );

        if (!user) {
          await ctx.reply(
            "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
          );

          return;
        }

        const text =
          ctx.message.text.trim();

        // ========================================================
        // 💵 QARZ TO‘LOVI
        // ========================================================

        const debtPaymentState =
          this.debtPaymentState.get(
            ctx.from.id,
          );

        if (debtPaymentState) {
          const amount =
            this.parseAmount(
              text,
            );

          if (!amount) {
            await ctx.reply(
              "❌ To‘lov summasi noto‘g‘ri.\n\n" +
              "Masalan:\n" +
              "50000",
            );

            return;
          }

          if (
            amount >
            debtPaymentState.maxAmount
          ) {
            await ctx.reply(
              "❌ To‘lov summasi qolgan qarzdan katta bo‘lishi mumkin emas.\n\n" +
              `💳 Qolgan qarz: ${this.formatMoney(
                debtPaymentState.maxAmount,
              )} so‘m`,
            );

            return;
          }

          try {
            const result =
              await this.debtsService.payDebt(
                debtPaymentState.debtId,
                user.id,
                amount,
              );

            this.debtPaymentState.delete(
              ctx.from.id,
            );

            const remaining =
              Number(
                result.remaining,
              );

            let message =
              "✅ QARZ TO‘LANDI\n\n" +
              `📝 Sabab: ${result.debt.description}\n` +
              `💵 To‘landi: ${this.formatMoney(
                result.paid,
              )} so‘m\n` +
              `💳 Qolgan qarz: ${this.formatMoney(
                remaining,
              )} so‘m\n`;

            if (
              remaining === 0
            ) {
              message +=
                "\n🎉 Qarz to‘liq yopildi!";
            }

            message +=
              "\n\n🏦 Antiqa Kassa\n\n" +
              "Kerakli bo‘limni tanlang 👇";

            await ctx.reply(
              message,
              this.getMainKeyboard(),
            );
          } catch (error) {
            console.error(
              "❌ Debt payment error:",
              error,
            );

            await ctx.reply(
              "❌ Qarz to‘lashda xatolik yuz berdi.\n\n" +
              "Iltimos, qaytadan urinib ko‘ring.",
            );
          }

          return;
        }

        // ========================================================
        // 💸 XARAJAT
        // ========================================================

        const expenseState =
          this.expenseState.get(
            ctx.from.id,
          );

        if (expenseState) {
          // ======================================================
          // XARAJAT SUMMASI
          // ======================================================

          if (
            expenseState.step ===
            "amount"
          ) {
            const amount =
              this.parseAmount(
                text,
              );

            if (!amount) {
              await ctx.reply(
                "❌ Summa noto‘g‘ri.\n\n" +
                "Faqat musbat son kiriting.\n\n" +
                "Masalan:\n" +
                "100000",
              );

              return;
            }

            this.expenseState.set(
              ctx.from.id,
              {
                step:
                  "paidAmount",
                amount,
              },
            );

            await ctx.reply(
              `💸 Xarajat: ${this.formatMoney(
                amount,
              )} so‘m\n\n` +
              "💵 Qancha to‘landi?\n\n" +
              "Agar umuman to‘lanmagan bo‘lsa, 0 yozing.\n\n" +
              "Masalan:\n" +
              "50000",
            );

            return;
          }

          // ======================================================
          // TO‘LANGAN SUMMA
          // ======================================================

          if (
            expenseState.step ===
            "paidAmount"
          ) {
            if (
              expenseState.amount ===
              undefined
            ) {
              await ctx.reply(
                "❌ Xarajat summasi topilmadi.\n\n" +
                "Qaytadan boshlang.",
              );

              this.expenseState.delete(
                ctx.from.id,
              );

              return;
            }

            const paidAmount =
              this.parseNonNegativeAmount(
                text,
              );

            if (
              paidAmount ===
              null
            ) {
              await ctx.reply(
                "❌ To‘langan summa noto‘g‘ri.\n\n" +
                "Masalan:\n" +
                "50000\n\n" +
                "Agar to‘lanmagan bo‘lsa:\n" +
                "0",
              );

              return;
            }

            if (
              paidAmount >
              expenseState.amount
            ) {
              await ctx.reply(
                "❌ To‘langan summa xarajat summasidan katta bo‘lishi mumkin emas.\n\n" +
                `💸 Xarajat: ${this.formatMoney(
                  expenseState.amount,
                )} so‘m`,
              );

              return;
            }

            this.expenseState.set(
              ctx.from.id,
              {
                step:
                  "description",
                amount:
                  expenseState.amount,
                paidAmount,
              },
            );

            const debtAmount =
              expenseState.amount -
              paidAmount;

            await ctx.reply(
              `💸 Xarajat: ${this.formatMoney(
                expenseState.amount,
              )} so‘m\n` +
              `💵 To‘langan: ${this.formatMoney(
                paidAmount,
              )} so‘m\n` +
              `💳 Qarz: ${this.formatMoney(
                debtAmount,
              )} so‘m\n\n` +
              "📝 Xarajat nima uchun qilindi?\n\n" +
              "Masalan:\n" +
              "Go‘sht",
            );

            return;
          }

          // ======================================================
          // XARAJAT SABABI
          // ======================================================

          if (
            expenseState.step ===
            "description"
          ) {
            if (
              expenseState.amount ===
              undefined ||
              expenseState.paidAmount ===
              undefined
            ) {
              await ctx.reply(
                "❌ Xarajat ma'lumotlari topilmadi.\n\n" +
                "Qaytadan boshlang.",
              );

              this.expenseState.delete(
                ctx.from.id,
              );

              return;
            }

            const totalAmount =
              expenseState.amount;

            const paidAmount =
              expenseState.paidAmount;

            const debtAmount =
              totalAmount -
              paidAmount;

            try {
              // ==================================================
              // 💸 FAQAT HAQIQATDA TO‘LANGAN PULNI EXPENSE QILAMIZ
              // ==================================================

              const transaction =
                await this.transactionsService.createExpense(
                  user.id,
                  paidAmount,
                  text,
                );

              // ==================================================
              // 💳 QARZ YARATISH
              // ==================================================

              let debt: Awaited<
                ReturnType<typeof this.debtsService.createDebt>
              > = null;
              if (
                debtAmount > 0
              ) {
                debt =
                  await this.debtsService.createDebt(
                    user.id,
                    totalAmount,
                    paidAmount,
                    text,
                  );
              }

              this.expenseState.delete(
                ctx.from.id,
              );

              const employee =
                this.getEmployeeName(
                  user,
                );

              let message =
                "✅ XARAJAT SAQLANDI\n\n" +
                `👤 Xodim: ${employee}\n` +
                `💸 Xarajat: ${this.formatMoney(
                  totalAmount,
                )} so‘m\n` +
                `💵 To‘langan: ${this.formatMoney(
                  paidAmount,
                )} so‘m\n` +
                `💳 Qarz: ${this.formatMoney(
                  debtAmount,
                )} so‘m\n` +
                `📝 Sabab: ${text}\n`;

              if (
                debt
              ) {
                message +=
                  "\n💳 Qarzdorlik saqlandi.";
              }

              message +=
                "\n\n🏦 Antiqa Kassa\n\n" +
                "Kerakli bo‘limni tanlang 👇";

              await ctx.reply(
                message,
                this.getMainKeyboard(),
              );
            } catch (error) {
              console.error(
                "❌ Expense error:",
                error,
              );

              await ctx.reply(
                "❌ Xarajatni saqlashda xatolik yuz berdi.\n\n" +
                "Iltimos, qaytadan urinib ko‘ring.",
              );
            }

            return;
          }
        }

        // ========================================================
        // 💰 KIRIM
        // ========================================================

        const incomeState =
          this.incomeState.get(
            ctx.from.id,
          );

        if (incomeState) {
          // ======================================================
          // KIRIM SUMMASI
          // ======================================================

          if (
            incomeState.step ===
            "amount"
          ) {
            const amount =
              this.parseAmount(
                text,
              );

            if (!amount) {
              await ctx.reply(
                "❌ Summa noto‘g‘ri.\n\n" +
                "Faqat musbat son kiriting.\n\n" +
                "Masalan:\n" +
                "500000",
              );

              return;
            }

            this.incomeState.set(
              ctx.from.id,
              {
                step:
                  "description",
                amount,
              },
            );

            await ctx.reply(
              `💰 Summa: ${this.formatMoney(
                amount,
              )} so‘m\n\n` +
              "📝 Kirim qayerdan keldi?\n\n" +
              "Masalan:\n" +
              "Kassa",
            );

            return;
          }

          // ======================================================
          // KIRIM MANBAI
          // ======================================================

          if (
            incomeState.step ===
            "description"
          ) {
            if (
              incomeState.amount ===
              undefined
            ) {
              await ctx.reply(
                "❌ Summa topilmadi.\n\n" +
                "Qaytadan boshlang.",
              );

              this.incomeState.delete(
                ctx.from.id,
              );

              return;
            }

            try {
              const transaction =
                await this.transactionsService.createIncome(
                  user.id,
                  incomeState.amount,
                  text,
                );

              this.incomeState.delete(
                ctx.from.id,
              );

              const employee =
                this.getEmployeeName(
                  user,
                );

              await ctx.reply(
                "✅ KIRIM SAQLANDI!\n\n" +
                `👤 Xodim: ${employee}\n` +
                `💰 Summa: ${this.formatMoney(
                  transaction.amount,
                )} so‘m\n` +
                `📝 Manba: ${transaction.description}\n\n` +
                "🏦 Antiqa Kassa\n\n" +
                "Kerakli bo‘limni tanlang 👇",
                this.getMainKeyboard(),
              );
            } catch (error) {
              console.error(
                "❌ Income error:",
                error,
              );

              await ctx.reply(
                "❌ Kirimni saqlashda xatolik yuz berdi.",
              );
            }

            return;
          }
        }
      },
    );

    // ==========================================================
    // BOTNI ISHGA TUSHIRISH
    // ==========================================================

    await this.bot.launch();

    console.log(
      "🤖 Telegram bot ishga tushdi",
    );
  }

  // ============================================================
  // 🏠 ASOSIY MENU
  // ============================================================

  private getMainKeyboard() {
    return Markup.keyboard([
      [
        "💰 Kirim",
        "💸 Xarajat",
      ],
      [
        "📊 Hisobot",
        "🔐 Seyf",
      ],
    ]).resize();
  }

  // ============================================================
  // 📊 HISOBOT MENU
  // ============================================================

  private getReportKeyboard() {
    return Markup.keyboard([
      ["📅 Bugun"],
      [
        "📆 Oylik",
        "🗓 Yillik",
      ],
      ["💳 Qarzlar"],
      ["⬅️ Orqaga"],
    ]).resize();
  }

  // ============================================================
  // 📊 HISOBOTNI TELEGRAMGA CHIQARISH
  // ============================================================

  private async sendReport(
    ctx: any,
    report: any,
    title: string,
  ) {
    const totalIncome =
      Number(
        report.totalIncome || 0,
      );

    const totalExpense =
      Number(
        report.totalExpense || 0,
      );

    const balance =
      totalIncome -
      totalExpense;

    let message =
      `${title}\n\n` +
      `💰 Jami kirim: ${this.formatMoney(
        totalIncome,
      )} so‘m\n` +
      `💸 Jami xarajat: ${this.formatMoney(
        totalExpense,
      )} so‘m\n` +
      "➖➖➖➖➖➖➖\n" +
      `💵 Sof qoldiq: ${this.formatMoney(
        balance,
      )} so‘m\n`;

    // ==========================================================
    // 👥 XODIMLAR BO‘YICHA
    // ==========================================================

    if (
      report.users &&
      report.users.length > 0
    ) {
      message +=
        "\n👥 XODIMLAR BO‘YICHA:\n";

      for (
        const item of
        report.users
      ) {
        const employee =
          item.username
            ? `@${item.username}`
            : item.firstName ||
            "Noma'lum";

        const income =
          Number(
            item.income || 0,
          );

        const expense =
          Number(
            item.expense || 0,
          );

        message +=
          `\n👤 ${employee}\n` +
          `   💰 Kirim: ${this.formatMoney(
            income,
          )} so‘m\n` +
          `   💸 Xarajat: ${this.formatMoney(
            expense,
          )} so‘m\n`;
      }
    }

    // ==========================================================
    // 🧾 TRANSAKSIYALAR
    // ==========================================================

    if (
      report.transactions &&
      report.transactions.length > 0
    ) {
      message +=
        "\n🧾 TRANSAKSIYALAR:\n";

      for (
        const transaction of
        report.transactions
      ) {
        const employee =
          transaction.user
            ?.username
            ? `@${transaction.user.username}`
            : transaction.user
              ?.firstName ||
            "Noma'lum";

        const amount =
          Number(
            transaction.amount,
          );

        if (
          transaction.type ===
          "INCOME"
        ) {
          message +=
            `\n💰 +${this.formatMoney(
              amount,
            )} so‘m\n` +
            `   📝 ${transaction.description}\n` +
            `   👤 ${employee}\n`;
        } else {
          message +=
            `\n💸 -${this.formatMoney(
              amount,
            )} so‘m\n` +
            `   📝 ${transaction.description}\n` +
            `   👤 ${employee}\n`;
        }
      }
    }

    message +=
      "\n🏦 Antiqa Kassa\n\n" +
      "Kerakli bo‘limni tanlang 👇";

    await ctx.reply(
      message,
      this.getReportKeyboard(),
    );
  }

  // ============================================================
  // /START
  // ============================================================

  private async handleStart(
    ctx: any,
  ) {
    const telegramId =
      String(ctx.from.id);

    const username =
      ctx.from.username;

    const firstName =
      ctx.from.first_name;

    // ==========================================================
    // ADMIN ID
    // ==========================================================

    const adminId =
      this.configService.get<string>(
        "ADMIN_TELEGRAM_ID",
      );

    // ==========================================================
    // KAMRON ID
    // ==========================================================

    const kamronId =
      this.configService.get<string>(
        "KAMRON_TELEGRAM_ID",
      );

    let role:
      | "ADMIN"
      | "CASHIER";

    // ==========================================================
    // 👑 FARRUX ADMIN
    // ==========================================================

    if (
      telegramId === adminId
    ) {
      role = "ADMIN";
    }

    // ==========================================================
    // 👤 KAMRON KASSIR
    // ==========================================================

    else if (
      telegramId === kamronId
    ) {
      role = "CASHIER";
    }

    // ==========================================================
    // ❌ BEGONA USER
    // ==========================================================

    else {
      await ctx.reply(
        "❌ Sizda ushbu botdan foydalanish huquqi yo‘q.",
      );

      return;
    }

    // ==========================================================
    // USERNI DATABASEGA SAQLASH
    // ==========================================================

    await this.usersService.createUser({
      telegramId,
      username,
      firstName,
      role,
    });

    // ==========================================================
    // MENU
    // ==========================================================

    await ctx.reply(
      "🏦 Antiqa Kassa\n\n" +
      `${role === "ADMIN"
        ? "👑"
        : "👤"
      } ` +
      `Assalomu alaykum, ${firstName ||
      "foydalanuvchi"
      }!\n\n` +
      "Kerakli bo‘limni tanlang 👇",
      this.getMainKeyboard(),
    );
  }

  // ============================================================
  // 👤 XODIM NOMI
  // ============================================================

  private getEmployeeName(
    user: any,
  ) {
    if (user.username) {
      return `@${user.username}`;
    }

    if (user.firstName) {
      return user.firstName;
    }

    return "Noma'lum";
  }

  // ============================================================
  // 💰 MUSBAT SUMMA
  // ============================================================

  private parseAmount(
    text: string,
  ): number | null {
    const cleaned =
      text
        .replace(/\s/g, "")
        .replace(/,/g, "")
        .replace(/\./g, "");

    const amount =
      Number(cleaned);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return null;
    }

    return amount;
  }

  // ============================================================
  // 💵 0 DAN KATTA YOKI TENG SUMMA
  // ============================================================

  private parseNonNegativeAmount(
    text: string,
  ): number | null {
    const cleaned =
      text
        .replace(/\s/g, "")
        .replace(/,/g, "")
        .replace(/\./g, "");

    const amount =
      Number(cleaned);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return null;
    }

    return amount;
  }

  // ============================================================
  // 📅 SANA FORMAT
  // ============================================================

  private formatDate(
    date: Date,
  ): string {
    return new Date(
      date,
    ).toLocaleDateString(
      "uz-UZ",
    );
  }

  // ============================================================
  // 🧹 BARCHA HOLATLARNI TOZALASH
  // ============================================================

  private clearStates(
    telegramId: number,
  ) {
    this.incomeState.delete(
      telegramId,
    );

    this.expenseState.delete(
      telegramId,
    );

    this.debtPaymentState.delete(
      telegramId,
    );
  }

  // ============================================================
  // 💵 PUL FORMAT
  // ============================================================

  private formatMoney(
    amount: any,
  ): string {
    return Number(
      amount || 0,
    ).toLocaleString(
      "uz-UZ",
    );
  }


  async onModuleDestroy() {
    this.bot.stop(
      "NestJS application stopped",
    );
  }
}