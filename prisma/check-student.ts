import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students'
    ORDER BY ordinal_position
  `;

    if (columns.length === 0) {
        console.log("RESULT: the students table does NOT exist.");
        return;
    }

    console.log("RESULT: students table columns:");
    console.log(columns.map((c) => c.column_name).join(", "));

    const count = await prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM students`;
    console.log(`Number of students: ${count[0].total}`);
}

main().finally(() => prisma.$disconnect());