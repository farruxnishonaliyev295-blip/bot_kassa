import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf, Markup } from "telegraf";

import { UsersService } from "../users/users.service";
import { TransactionsService } from "../transactions/transactions.service";

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
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
      step: "amount" | "description";
      amount?: number;
    }
  >();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
  ) {
    const token =
      this.configService.get<string>("BOT_TOKEN");

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

    this.bot.hears("💰 Kirim", async (ctx) => {
      const telegramId = String(ctx.from.id);

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

      // Boshqa jarayonni tozalash
      this.expenseState.delete(ctx.from.id);

      this.incomeState.set(ctx.from.id, {
        step: "amount",
      });

      await ctx.reply(
        "💰 KIRIM\n\n" +
          "Kirim summasini kiriting:\n\n" +
          "Masalan:\n" +
          "500000",
      );
    });

    // ==========================================================
    // 💸 XARAJAT
    // ==========================================================

    this.bot.hears("💸 Xarajat", async (ctx) => {
      const telegramId = String(ctx.from.id);

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

      // Boshqa jarayonni tozalash
      this.incomeState.delete(ctx.from.id);

      this.expenseState.set(ctx.from.id, {
        step: "amount",
      });

      await ctx.reply(
        "💸 XARAJAT\n\n" +
          "Xarajat summasini kiriting:\n\n" +
          "Masalan:\n" +
          "250000",
      );
    });

    // ==========================================================
    // 📊 HISOBOT
    // ==========================================================

    this.bot.hears("📊 Hisobot", async (ctx) => {
      const telegramId = String(ctx.from.id);

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

      this.incomeState.delete(ctx.from.id);
      this.expenseState.delete(ctx.from.id);

      await ctx.reply(
        "📊 HISOBOT\n\n" +
          "Qaysi hisobotni ko‘rmoqchisiz?",
        this.getReportKeyboard(),
      );
    });

    // ==========================================================
    // 📅 BUGUNGI HISOBOT
    // ==========================================================

    this.bot.hears("📅 Bugun", async (ctx) => {
      const telegramId = String(ctx.from.id);

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
    });

    // ==========================================================
    // 📆 OYLIK HISOBOT
    // ==========================================================

    this.bot.hears("📆 Oylik", async (ctx) => {
      const telegramId = String(ctx.from.id);

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
    });

    // ==========================================================
    // 🗓 YILLIK HISOBOT
    // ==========================================================

    this.bot.hears("🗓 Yillik", async (ctx) => {
      const telegramId = String(ctx.from.id);

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
    });

    // ==========================================================
    // 🔐 SEYF
    // ==========================================================

    this.bot.hears("🔐 Seyf", async (ctx) => {
      const telegramId = String(ctx.from.id);

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

      // Kiritish jarayonlarini tozalash
      this.incomeState.delete(ctx.from.id);
      this.expenseState.delete(ctx.from.id);

      // Barcha kirim va xarajatlarni olish
      const safe =
        await this.transactionsService.getSafeBalance();

      const totalIncome = Number(
        safe.totalIncome || 0,
      );

      const totalExpense = Number(
        safe.totalExpense || 0,
      );

      // Seyfdagi real qoldiq
      const balance =
        totalIncome - totalExpense;

      let balanceText = "";

      if (balance > 0) {
        balanceText =
          `💵 SEYFDA QOLGAN: ${this.formatMoney(
            balance,
          )} so‘m`;
      } else if (balance === 0) {
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
    });

    // ==========================================================
    // ⬅️ ORQAGA
    // ==========================================================

    this.bot.hears("⬅️ Orqaga", async (ctx) => {
      const telegramId = String(ctx.from.id);

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

      this.incomeState.delete(ctx.from.id);
      this.expenseState.delete(ctx.from.id);

      await ctx.reply(
        "🏦 Antiqa Kassa\n\n" +
          "Kerakli bo‘limni tanlang 👇",
        this.getMainKeyboard(),
      );
    });

    // ==========================================================
    // 📝 TEXT XABARLAR
    // ==========================================================

    this.bot.on("text", async (ctx) => {
      const telegramId = String(ctx.from.id);

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
      // 💸 XARAJAT
      // ========================================================

      const expenseState =
        this.expenseState.get(ctx.from.id);

      if (expenseState) {
        // ======================================================
        // XARAJAT SUMMASI
        // ======================================================

        if (
          expenseState.step === "amount"
        ) {
          const amount =
            this.parseAmount(text);

          if (!amount) {
            await ctx.reply(
              "❌ Summa noto‘g‘ri.\n\n" +
                "Faqat musbat son kiriting.\n\n" +
                "Masalan:\n" +
                "250000",
            );

            return;
          }

          this.expenseState.set(
            ctx.from.id,
            {
              step: "description",
              amount,
            },
          );

          await ctx.reply(
            `💸 Summa: ${this.formatMoney(
              amount,
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
          if (!expenseState.amount) {
            await ctx.reply(
              "❌ Summa topilmadi.\n\n" +
                "Qaytadan boshlang.",
            );

            this.expenseState.delete(
              ctx.from.id,
            );

            return;
          }

          const transaction =
            await this.transactionsService.createExpense(
              user.id,
              expenseState.amount,
              text,
            );

          this.expenseState.delete(
            ctx.from.id,
          );

          const employee =
            this.getEmployeeName(user);

          await ctx.reply(
            "✅ XARAJAT SAQLANDI!\n\n" +
              `👤 Xodim: ${employee}\n` +
              `💸 Summa: ${this.formatMoney(
                transaction.amount,
              )} so‘m\n` +
              `📝 Sabab: ${transaction.description}\n\n` +
              "🏦 Antiqa Kassa\n\n" +
              "Kerakli bo‘limni tanlang 👇",
            this.getMainKeyboard(),
          );

          return;
        }
      }

      // ========================================================
      // 💰 KIRIM
      // ========================================================

      const incomeState =
        this.incomeState.get(ctx.from.id);

      if (incomeState) {
        // ======================================================
        // KIRIM SUMMASI
        // ======================================================

        if (
          incomeState.step === "amount"
        ) {
          const amount =
            this.parseAmount(text);

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
              step: "description",
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
        // KIRIM MANBASI
        // ======================================================

        if (
          incomeState.step ===
          "description"
        ) {
          if (!incomeState.amount) {
            await ctx.reply(
              "❌ Summa topilmadi.\n\n" +
                "Qaytadan boshlang.",
            );

            this.incomeState.delete(
              ctx.from.id,
            );

            return;
          }

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
            this.getEmployeeName(user);

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

          return;
        }
      }
    });

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
      ["💰 Kirim", "💸 Xarajat"],
      ["📊 Hisobot", "🔐 Seyf"],
    ]).resize();
  }

  // ============================================================
  // 📊 HISOBOT MENU
  // ============================================================

  private getReportKeyboard() {
    return Markup.keyboard([
      ["📅 Bugun"],
      ["📆 Oylik", "🗓 Yillik"],
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
      Number(report.totalIncome || 0);

    const totalExpense =
      Number(report.totalExpense || 0);

    const balance =
      totalIncome - totalExpense;

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
        const item of report.users
      ) {
        const employee =
          item.username
            ? `@${item.username}`
            : item.firstName ||
              "Noma'lum";

        const income =
          Number(item.income || 0);

        const expense =
          Number(item.expense || 0);

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
          transaction.user?.username
            ? `@${transaction.user.username}`
            : transaction.user
                ?.firstName ||
              "Noma'lum";

        const amount =
          Number(transaction.amount);

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

  private async handleStart(ctx: any) {
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
        `${
          role === "ADMIN"
            ? "👑"
            : "👤"
        } ` +
        `Assalomu alaykum, ${
          firstName || "foydalanuvchi"
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
  // 💰 SUMMANI TEKSHIRISH
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

  // ============================================================
  // BOTNI TO‘XTATISH
  // ============================================================

  async onModuleDestroy() {
    this.bot.stop(
      "NestJS application stopped",
    );
  }
}