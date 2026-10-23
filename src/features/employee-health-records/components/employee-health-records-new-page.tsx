import LogVisitPage from "@/features/student-health-records/components/log-visit-page";

type Props = {
    searchParams: Promise<{ employee?: string }>;
};

export default async function NewEmployeeRecordPage({ searchParams }: Props) {
    const { employee = "" } = await searchParams;
    return LogVisitPage({ type: "employee", person: employee });
}