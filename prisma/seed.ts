import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@softoi.shop";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "062618";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        name: "Softoi Admin",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}`);
    console.log("Change this password after first login.");
  } else {
    console.log(`Admin user ${adminEmail} already exists — skipping.`);
  }

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({
      data: {
        businessName: "Softoi",
        currency: "INR",
        defaultMinimumStock: 5,
        allowNegativeStock: false,
      },
    });
    console.log("Created default Settings row.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
