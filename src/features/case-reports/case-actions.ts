"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";

const BASE = "/dashboard/health-case-reports";

function refresh() {
  revalidatePath(BASE);
  revalidatePath("/dashboard/archive-records");
  revalidatePath("/dashboard");
}

export async function archiveCase(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const caseId = Number(formData.get("caseId"));
  if (!caseId) return;

  await prisma.$executeRaw`
    UPDATE health_case_reports
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE case_id = ${caseId} AND archived_at IS NULL
  `;

  refresh();

  // Galing sa Edit Case Report: bumalik sa listahan (wala na roon ang case)
  const returnTo = String(formData.get("returnTo") ?? "");
  if (returnTo.startsWith("/dashboard")) redirect(returnTo);
}

export async function restoreCase(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const caseId = Number(formData.get("caseId"));
  if (!caseId) return;

  await prisma.$executeRaw`
    UPDATE health_case_reports
    SET archived_at = NULL, archived_by = NULL
    WHERE case_id = ${caseId}
  `;

  refresh();
}

export async function deleteCase(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const caseId = Number(formData.get("caseId"));
  if (!caseId) return;

  await prisma.$executeRaw`
    DELETE FROM health_case_reports
    WHERE case_id = ${caseId} AND archived_at IS NOT NULL
  `;

  refresh();
}

export async function setCaseStatus(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageRecords(session.role)) return;

  const caseId = Number(formData.get("caseId"));
  const status = String(formData.get("status") ?? "");

  if (!caseId) return;
  if (!["pending", "referred", "resolved"].includes(status)) return;

  await prisma.$executeRaw`
    UPDATE health_case_reports SET status = ${status} WHERE case_id = ${caseId}
  `;

  refresh();
}