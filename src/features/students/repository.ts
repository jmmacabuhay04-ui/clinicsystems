// Students repository: ang TANGING file sa feature na ito na kumakausap sa database.
// Walang permission check o validation dito; puro query lang.
import { prisma } from "@/lib/prisma";
import type { StudentDetailRow, StudentFilters, StudentInput, StudentListRow } from "./types";

export const studentRepository = {
  /** Isang page ng active (hindi archived) students, may search at filters. */
  findPage(f: StudentFilters, limit: number, offset: number) {
    const like = `%${f.q}%`;
    return prisma.$queryRaw<StudentListRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, gender, avatar
      FROM students
      WHERE archived_at IS NULL
        AND (${f.grade}::text = '' OR grade_level = ${f.grade})
        AND (${f.program}::text = '' OR program = ${f.program})
        AND (
          ${f.q}::text = ''
          OR student_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
          OR middle_name ILIKE ${like}
          OR (first_name || ' ' || last_name) ILIKE ${like}
          OR (last_name || ', ' || first_name) ILIKE ${like}
        )
      ORDER BY student_number ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  },

  /** Bilang ng active students na tugma sa search at filters. */
  async count(f: StudentFilters) {
    const like = `%${f.q}%`;
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM students
      WHERE archived_at IS NULL
        AND (${f.grade}::text = '' OR grade_level = ${f.grade})
        AND (${f.program}::text = '' OR program = ${f.program})
        AND (
          ${f.q}::text = ''
          OR student_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
          OR middle_name ILIKE ${like}
          OR (first_name || ' ' || last_name) ILIKE ${like}
          OR (last_name || ', ' || first_name) ILIKE ${like}
        )
    `;
    return rows[0]?.count ?? 0;
  },

  /** Mga pagpipilian sa Grade Level at Program na dropdown. */
  async filterOptions() {
    const [grades, programs] = await Promise.all([
      prisma.$queryRaw<{ value: string }[]>`
        SELECT DISTINCT grade_level AS value FROM students
        WHERE archived_at IS NULL AND grade_level IS NOT NULL AND grade_level <> ''
        ORDER BY value
      `,
      prisma.$queryRaw<{ value: string }[]>`
        SELECT DISTINCT program AS value FROM students
        WHERE archived_at IS NULL AND program IS NOT NULL AND program <> ''
        ORDER BY value
      `,
    ]);
    return { grades: grades.map((r) => r.value), programs: programs.map((r) => r.value) };
  },

  /** Active student ayon sa student number. */
  async findActiveByNumber(studentNumber: string) {
    const rows = await prisma.$queryRaw<StudentDetailRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, date_of_birth, gender, contact_number, email
      FROM students
      WHERE student_number = ${studentNumber} AND archived_at IS NULL
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  /** May iba bang student na gumagamit ng student number na ito? */
  async numberTaken(studentNumber: string, exceptId?: number) {
    const rows = exceptId
      ? await prisma.$queryRaw<{ student_id: number }[]>`
          SELECT student_id FROM students
          WHERE student_number = ${studentNumber} AND student_id <> ${exceptId}
          LIMIT 1
        `
      : await prisma.$queryRaw<{ student_id: number }[]>`
          SELECT student_id FROM students WHERE student_number = ${studentNumber} LIMIT 1
        `;
    return Boolean(rows[0]);
  },

  /** May iba bang student na gumagamit ng email na ito? */
  async emailTaken(email: string, exceptId?: number) {
    const rows = exceptId
      ? await prisma.$queryRaw<{ student_id: number }[]>`
          SELECT student_id FROM students
          WHERE LOWER(email) = ${email} AND student_id <> ${exceptId}
          LIMIT 1
        `
      : await prisma.$queryRaw<{ student_id: number }[]>`
          SELECT student_id FROM students WHERE LOWER(email) = ${email} LIMIT 1
        `;
    return Boolean(rows[0]);
  },

  /** must_change_password = TRUE dahil alam ng nurse ang password na ito. */
  insert(data: StudentInput, hashedPassword: string) {
    return prisma.$executeRaw`
      INSERT INTO students
        (student_number, password, last_name, first_name, middle_name,
         grade_level, program, date_of_birth, gender,
         contact_number, email, must_change_password)
      VALUES
        (${data.studentNumber}, ${hashedPassword}, ${data.lastName}, ${data.firstName},
         ${data.middleName}, ${data.gradeLevel}, ${data.program},
         CAST(${data.dateOfBirth} AS DATE), ${data.gender},
         ${data.contactNumber}, ${data.email}, TRUE)
    `;
  },

  update(studentId: number, data: StudentInput) {
    return prisma.$executeRaw`
      UPDATE students
      SET student_number = ${data.studentNumber},
          last_name      = ${data.lastName},
          first_name     = ${data.firstName},
          middle_name    = ${data.middleName},
          grade_level    = ${data.gradeLevel},
          program        = ${data.program},
          date_of_birth  = CAST(${data.dateOfBirth} AS DATE),
          gender         = ${data.gender},
          contact_number = ${data.contactNumber},
          email          = ${data.email}
      WHERE student_id = ${studentId}
    `;
  },

  setPassword(studentId: number, hashedPassword: string) {
    return prisma.$executeRaw`
      UPDATE students
      SET password = ${hashedPassword}, must_change_password = TRUE
      WHERE student_id = ${studentId}
    `;
  },

  archive(studentId: number, archivedBy: number | string) {
    return prisma.$executeRaw`
      UPDATE students
      SET archived_at = NOW(), archived_by = ${archivedBy}
      WHERE student_id = ${studentId} AND archived_at IS NULL
    `;
  },

  restore(studentId: number) {
    return prisma.$executeRaw`
      UPDATE students
      SET archived_at = NULL, archived_by = NULL
      WHERE student_id = ${studentId}
    `;
  },

  async findArchiveInfo(studentId: number) {
    const rows = await prisma.$queryRaw<{ archived_at: Date | null; student_number: string }[]>`
      SELECT archived_at, student_number FROM students
      WHERE student_id = ${studentId} LIMIT 1
    `;
    return rows[0] ?? null;
  },

  /** Binubura lang kapag lampas na sa retention period. */
  deleteAfterRetention(studentId: number, retentionYears: number) {
    return prisma.$executeRaw`
      DELETE FROM students
      WHERE student_id = ${studentId}
        AND archived_at IS NOT NULL
        AND archived_at < NOW() - (${retentionYears} || ' years')::interval
    `;
  },

  /** Password hash ng staff, para sa re-authentication. */
  async findStaffPasswordHash(userId: number) {
    const staff = await prisma.user.findUnique({ where: { user_id: userId } });
    return staff?.password ?? null;
  },
};