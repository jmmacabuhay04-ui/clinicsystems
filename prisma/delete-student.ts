import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const studentNumber = process.argv[2];

    if (!studentNumber) {
        console.log("Usage: npx tsx prisma/delete-student.ts <studentNumber>");
        return;
    }

    const deleted = await prisma.$executeRaw`
    DELETE FROM students WHERE student_number = ${studentNumber}
  `;

    console.log(deleted ? `Deleted student ${studentNumber}.` : `Student ${studentNumber} not found.`);
}

main().finally(() => prisma.$disconnect());