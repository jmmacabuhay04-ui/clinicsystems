import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const [studentNumber, password, lastName, firstName, middleName = "", gradeLevel = "", program = ""] =
        process.argv.slice(2);

    if (!studentNumber || !password || !lastName || !firstName) {
        console.log(
            'Usage: npx tsx prisma/add-student.ts <studentNumber> <password> "<lastName>" "<firstName>" "<middleName>" "<gradeLevel>" "<program>"'
        );
        return;
    }

    if (password.length < 8) {
        console.log("Password must be at least 8 characters.");
        return;
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.$executeRaw`
    INSERT INTO students
      (student_number, password, last_name, first_name, middle_name, grade_level, program)
    VALUES
      (${studentNumber}, ${hashed}, ${lastName}, ${firstName},
       ${middleName || null}, ${gradeLevel || null}, ${program || null})
    ON CONFLICT (student_number) DO UPDATE
    SET password    = EXCLUDED.password,
        last_name   = EXCLUDED.last_name,
        first_name  = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        grade_level = EXCLUDED.grade_level,
        program     = EXCLUDED.program
  `;

    console.log(`Student ready: ${studentNumber} (${lastName}, ${firstName})`);
}

main().finally(() => prisma.$disconnect());