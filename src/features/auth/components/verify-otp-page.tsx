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
            title="Enter Code"
            subtitle={
                email ? (
                    <>
                        We sent a 6-digit code to <span className="font-semibold text-white">{email}</span>
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
                    <p className="text-sm text-red-300">No email address provided.</p>
                    <Link href="/forgot-password" className="text-sm font-semibold text-amber-300 hover:underline">
                        Request a code
                    </Link>
                </div>
            )}
        </AuthShell>
    );
}