"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RETENTION_YEARS } from "@/lib/retention";

// Nurse lang ang puwedeng mag-restore o magbura ng archived medical certificate.

// Ibalik ang naka-archive na certificate sa listahan ng estudyante
export async function restoreMedicalCertificate(formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== "nurse") return;

    const certId = Number(formData.get("certId"));
    if (!certId) return;

    await prisma.$executeRaw`
    UPDATE student_medical_certificates SET archived_at = NULL
    WHERE id = ${certId} AND archived_at IS NOT NULL
  `;

    revalidatePath("/dashboard/archive-records");
    revalidatePath("/dashboard/student-health-records");
}

// Permanenteng burahin, pero kapag lumampas na sa retention (5 taon)
export async function deleteMedicalCertificate(formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== "nurse") return;

    const certId = Number(formData.get("certId"));
    if (!certId) return;

    await prisma.$executeRaw`
    DELETE FROM student_medical_certificates
    WHERE id = ${certId} AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

    revalidatePath("/dashboard/archive-records");
    revalidatePath("/dashboard/student-health-records");
}