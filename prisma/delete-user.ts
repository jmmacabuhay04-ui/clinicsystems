import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
        console.log("Usage: npx tsx prisma/delete-user.ts <email>");
        return;
    }

    const deleted = await prisma.$executeRaw`
    DELETE FROM users WHERE username = ${email}
  `;

    console.log(deleted ? `Deleted account ${email}.` : `Account ${email} not found.`);
}

main().finally(() => prisma.$disconnect());
