import Link from "next/link";
import VerifyForm from "./verify-form";
import AuthShell from "./auth-shell";

type Props = {
    searchParams: Promise<{ email?: string }>;
};

export default async function VerifyOtpPage({ searchParams }: Props) {
    const { email = "" } = await searchParams;

    return (
        <AuthShell
            eyebrow="Account help"
            title="Enter Code"
            subtitle={
                email ? (
                    <>
                        We sent a 6-digit code to <span className="break-all font-semibold text-gray-900">{email}</span>
                    </>
                ) : (
                    "Enter the 6-digit code sent to your email."
                )
            }
        >
            {email ? (
                <VerifyForm email={email} />
            ) : (
                <div className="space-y-4 text-center">
                    <p className="text-sm text-red-700">No email address provided.</p>
                    <Link href="/forgot-password" className="text-sm font-semibold text-[#15664f] hover:underline">
                        Request a code
                    </Link>
                </div>
            )}
        </AuthShell>
    );
}