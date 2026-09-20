import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("student123", 12);

  await prisma.$executeRaw`
    INSERT INTO students (student_number, first_name, last_name, password)
    VALUES ('2023-12345', 'Juan', 'Dela Cruz', ${hashed})
    ON CONFLICT (student_number) DO UPDATE SET password = EXCLUDED.password
  `;

  console.log("Demo student ready: / student123");
}

main().finally(() => prisma.$disconnect());