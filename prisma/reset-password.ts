import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const [emailArg, newPassword] = process.argv.slice(2);

    if (!emailArg || !newPassword) {
        console.log("Usage: npx tsx prisma/reset-password.ts <email> <newPassword>");
        return;
    }

    if (newPassword.length < 8) {
        console.log("Password must be at least 8 characters.");
        return;
    }

    const email = emailArg.trim().toLowerCase();
    const hashed = await bcrypt.hash(newPassword, 12);

    const updated = await prisma.$executeRaw`
    UPDATE users SET password = ${hashed} WHERE username = ${email}
  `;

    console.log(updated ? `Password reset for ${email}.` : `Account ${email} not found.`);
}

main().finally(() => prisma.$disconnect());