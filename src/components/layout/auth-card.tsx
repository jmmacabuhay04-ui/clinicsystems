import Image from "next/image";

type AuthCardProps = {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
    return (
        <main
            className="flex min-h-screen flex-col items-center justify-center p-4"
            style={{ background: "linear-gradient(180deg, #e8f5ef 0%, #f7fbf9 100%)" }}
        >
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <Image src="/bcas.jpg" alt="BCAS logo" width={100} height={100} priority />
                    <h1 className="mt-4 text-3xl font-bold text-gray-900">{title}</h1>
                    {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
                </div>
                {children}
            </div>
            {footer && <div className="mt-6 text-sm text-gray-600">{footer}</div>}
        </main>
    );
}