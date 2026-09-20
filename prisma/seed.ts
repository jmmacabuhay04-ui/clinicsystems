import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const accounts = [
    { username: "admin@bcas.edu.ph", password: "admin123", role: "admin" },
    { username: "jgarcia@bcas.edu.ph", password: "doctor123", role: "doctor" },
    { username: "alim@bcas.edu.ph", password: "dentist123", role: "dentist" },
];

async function main() {
    for (const acc of accounts) {
        const hashed = await bcrypt.hash(acc.password, 12);
        await prisma.user.upsert({
            where: { username: acc.username },
            update: { password: hashed, role: acc.role },
            create: { username: acc.username, password: hashed, role: acc.role },
        });
        console.log(`Ready: ${acc.username} (${acc.role})`);
    }
}

main().finally(() => prisma.$disconnect());