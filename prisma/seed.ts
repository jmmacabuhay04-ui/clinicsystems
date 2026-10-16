
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const username = process.env.SEED_ADMIN_USERNAME;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!username || !password || password.length < 12) {
        throw new Error(
            "Set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD (at least 12 characters).",
        );
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
        where: { username },
        update: { role: "admin" },
        create: { username, password: hashed, role: "admin" },
    });
    console.log(`Ready: ${username} (admin)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());