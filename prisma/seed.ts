import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, LegKind } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();

  const admin = await prisma.user.upsert({
    where: { email: adminEmail ?? "admin@example.com" },
    update: { role: Role.ADMIN },
    create: {
      email: adminEmail ?? "admin@example.com",
      name: "Admin",
      role: Role.ADMIN,
      points: 1000,
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const meeting = await prisma.meeting.create({
    data: {
      title: "CM Meeting",
      description: "Weekly CM TA meeting",
      startTime: tomorrow,
      createdById: admin.id,
      legs: {
        create: [
          {
            kind: LegKind.MONEYLINE,
            prompt: "Meeting ends early",
            sideALabel: "Yes",
            sideBLabel: "No",
          },
          {
            kind: LegKind.OVER_UNDER,
            prompt: "Number of shushes",
            line: 2.5,
            sideALabel: "Over",
            sideBLabel: "Under",
          },
          {
            kind: LegKind.OVER_UNDER,
            prompt: '"Put your devices away" reminders',
            line: 3.5,
            sideALabel: "Over",
            sideBLabel: "Under",
          },
        ],
      },
    },
  });

  console.log(`Seeded admin: ${admin.email}`);
  console.log(`Seeded meeting: ${meeting.title} (${meeting.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
