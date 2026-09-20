import Image from "next/image";
import Link from "next/link";
import VerifyForm from "./verify-form";

type Props = {
    searchParams: Promise<{ email?: string }>;
};

export default async function VerifyOtpPage({ searchParams }: Props) {
    const { email = "" } = await searchParams;

    return (
        <main
            className="flex min-h-screen flex-col items-center justify-center p-4"
            style={{ background: "linear-gradient(180deg, #e8f5ef 0%, #f7fbf9 100%)" }}
        >
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <Image src="/bcas.jpg" alt="BCAS logo" width={100} height={100} priority />
                    <h1 className="mt-4 text-3xl font-bold text-gray-900">Enter Code</h1>
                    <p className="mt-2 text-gray-500">
                        {email ? (
                            <>
                                We sent a 6-digit code to <span className="font-medium">{email}</span>
                            </>
                        ) : (
                            "Enter the 6-digit code sent to your email"
                        )}
                    </p>
                </div>

                {email ? (
                    <VerifyForm email={email} />
                ) : (
                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-sm text-red-600">No email address provided.</p>
                        <Link href="/forgot-password" className="text-sm text-[#0d6e56] hover:underline">
                            Request a code
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}