"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RETENTION_YEARS } from "@/lib/retention";
import { canManageRecords } from "@/lib/permissions";

function refresh() {
  revalidatePath("/dashboard/student-health-records");
  revalidatePath("/dashboard/archive-records");
}

export async function archiveRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const recordId = Number(formData.get("recordId"));
  if (!recordId) return;

  await prisma.$executeRaw`
    UPDATE health_records
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE record_id = ${recordId} AND archived_at IS NULL
  `;

  refresh();
}

export async function restoreRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const recordId = Number(formData.get("recordId"));
  if (!recordId) return;

  await prisma.$executeRaw`
    UPDATE health_records
    SET archived_at = NULL, archived_by = NULL
    WHERE record_id = ${recordId}
  `;

  refresh();
}

export async function deleteRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const recordId = Number(formData.get("recordId"));
  if (!recordId) return;

  await prisma.$executeRaw`
    DELETE FROM health_records WHERE record_id = ${recordId} AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

  refresh();
}