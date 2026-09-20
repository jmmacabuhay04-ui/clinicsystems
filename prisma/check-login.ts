import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const [emailArg, password] = process.argv.slice(2);

    const users = await prisma.user.findMany({
        select: { user_id: true, username: true, role: true },
        orderBy: { user_id: "asc" },
    });

    console.log("\nAccounts in the database:");
    console.table(users);

    if (!emailArg || !password) return;

    const email = emailArg.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { username: email } });

    if (!user) {
        console.log(`\nRESULT: "${email}" is NOT in the database.`);
        return;
    }

    const isHashed = user.password.startsWith("$2");
    const match = isHashed && (await bcrypt.compare(password, user.password));

    console.log(`\nRESULT for ${email}:`);
    console.log(`  Password is hashed: ${isHashed ? "YES" : "NO (plain text - login will fail)"}`);
    console.log(`  Password matches:   ${match ? "YES - login should work" : "NO"}`);
}

main().finally(() => prisma.$disconnect());