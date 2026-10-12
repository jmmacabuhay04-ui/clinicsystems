// Only the two raw-query methods are needed, so describe just those. This
// accepts both the normal client and the `tx` client given by
// prisma.$transaction(async (tx) => ...), whatever Prisma version or
// client extensions the project uses.
type Tx = {
    $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: any[]) => PromiseLike<T>;
    $executeRaw: (query: TemplateStringsArray, ...values: any[]) => PromiseLike<number>;
};

export type VisitCase = {
    studentId: number | null;
    employeeId: number | null;
    complaint: string;
    reportDate: string; // YYYY-MM-DD, same as the visit date
    staffName: string | null;
    notes: string | null;
    recordedBy: string | number;
};

async function nextCaseNumber(tx: Tx, year: number) {
    const prefix = `${year}-`;
    const rows = await tx.$queryRaw<{ case_number: string }[]>`
    SELECT case_number FROM health_case_reports
    WHERE case_number LIKE ${prefix + "%"}
    ORDER BY case_number DESC
    LIMIT 1
  `;

    const last = rows[0]?.case_number;
    const n = last ? Number(last.slice(prefix.length)) + 1 : 1;
    return prefix + String(n).padStart(3, "0");
}

/**
 * Creates a pending Health Case Report for a clinic visit that was just saved.
 * Call it inside the same transaction as the visit INSERT, so the visit and
 * its case are saved together or not at all.
 *
 * Returns false (and creates nothing) when the same patient already has an
 * active case with the same complaint on the same date, so a nurse who also
 * files the case by hand does not end up with a duplicate.
 */
export async function createCaseFromVisit(tx: Tx, v: VisitCase): Promise<boolean> {
    // Only one save at a time may pick the next case number.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;

    const existing =
        v.studentId !== null
            ? await tx.$queryRaw<{ case_id: number }[]>`
        SELECT case_id FROM health_case_reports
        WHERE archived_at IS NULL
          AND student_id = ${v.studentId}
          AND report_date = CAST(${v.reportDate} AS DATE)
          AND LOWER(TRIM(complaint)) = LOWER(TRIM(${v.complaint}))
        LIMIT 1
      `
            : await tx.$queryRaw<{ case_id: number }[]>`
        SELECT case_id FROM health_case_reports
        WHERE archived_at IS NULL
          AND employee_id = ${v.employeeId}
          AND report_date = CAST(${v.reportDate} AS DATE)
          AND LOWER(TRIM(complaint)) = LOWER(TRIM(${v.complaint}))
        LIMIT 1
      `;

    if (existing.length > 0) return false;

    const caseNumber = await nextCaseNumber(tx, Number(v.reportDate.slice(0, 4)));

    // Exactly one of student_id / employee_id is set; the other stays NULL.
    await tx.$executeRaw`
    INSERT INTO health_case_reports
      (case_number, student_id, employee_id, complaint, report_date,
       staff_name, status, notes, recorded_by)
    VALUES
      (${caseNumber}, ${v.studentId}, ${v.employeeId}, ${v.complaint},
       CAST(${v.reportDate} AS DATE), ${v.staffName}, 'pending',
       ${v.notes}, ${v.recordedBy})
  `;

    return true;
}