
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";

function refresh() {
  revalidatePath("/dashboard/student-health-records");
  revalidatePath("/dashboard/archive-records");
  revalidatePath("/dashboard");
}

export async function archiveStudent(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const studentId = Number(formData.get("studentId"));
  if (!studentId) return;

  await prisma.$executeRaw`
    UPDATE students
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE student_id = ${studentId} AND archived_at IS NULL
  `;

  refresh();
}

export async function restoreStudent(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const studentId = Number(formData.get("studentId"));
  if (!studentId) return;

  await prisma.$executeRaw`
    UPDATE students
    SET archived_at = NULL, archived_by = NULL
    WHERE student_id = ${studentId}
  `;

  refresh();
}

export async function deleteStudent(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const studentId = Number(formData.get("studentId"));
  if (!studentId) return;

  await prisma.$executeRaw`
    DELETE FROM students WHERE student_id = ${studentId} AND archived_at IS NOT NULL
  `;

  refresh();
}
