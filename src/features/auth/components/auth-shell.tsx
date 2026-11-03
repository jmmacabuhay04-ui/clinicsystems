import Image from "next/image";

// Itsura ng Forgot Password at Enter Code: KAPAREHO ng Log In page
// (mint na background, malabong campus photo, green na alon, puting card).

// Input: bilugan at mint, kapareho ng Log In
export const authInputClass =
    "h-12 w-full rounded-full border border-transparent bg-[#eef6f2] px-5 text-base text-gray-900 outline-none transition placeholder:text-gray-500 hover:border-[#cfe5d9] focus:border-[#15664f] focus:bg-white focus:ring-4 focus:ring-[#15664f]/10 md:text-sm";

// Green na button (kulay ng system)
export const authButtonClass =
    "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#15664f] px-4 text-sm font-semibold text-white shadow-lg shadow-[#15664f]/25 transition hover:bg-[#10523f] disabled:opacity-60";

// Label sa itaas ng input
export const authLabelClass = "block text-sm font-semibold text-gray-800";

// Error at success na mensahe
export const authErrorClass = "flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700";
export const authSuccessClass =
    "flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700";

// Lumulutang na mensahe sa itaas ng screen (hindi tinutulak pababa ang form)
export const authToastWrap = "pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 [&>*]:pointer-events-auto [&>*]:w-full [&>*]:max-w-sm [&>*]:shadow-lg";

// Link sa ibaba (hal. Back to Sign In)
export const authLinkClass = "font-semibold text-gray-600 hover:text-[#15664f] hover:underline";

export default function AuthShell({
    title,
    subtitle,
    eyebrow = "BCAS School Clinic",
    children,
}: {
    title: string;
    subtitle: React.ReactNode;
    eyebrow?: string;
    children: React.ReactNode;
}) {
    const year = new Date().getFullYear();

    return (
        <main className="relative min-h-dvh bg-[#e7f3e2]">
            {/* BACKGROUND: kapareho ng Log In; naka-"fixed" para hindi gumalaw kahit mag-scroll */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 scale-105 bg-cover bg-center blur-[2px]"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 bg-gradient-to-br from-white/85 via-[#eef6f2]/75 to-[#e7f3e2]/70"
            />
            <div aria-hidden className="pointer-events-none fixed -left-24 top-1/4 h-96 w-96 rounded-full bg-white/60 blur-3xl" />
            <div aria-hidden className="pointer-events-none fixed -right-20 bottom-0 h-80 w-80 rounded-full bg-[#15664f]/10 blur-3xl" />
            <svg
                aria-hidden
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
                className="pointer-events-none fixed bottom-0 left-0 h-28 w-2/3 sm:h-36 lg:h-44 lg:w-1/2"
            >
                <path d="M0 120 C 90 70, 190 90, 300 150 C 340 172, 370 188, 400 200 H0 Z" fill="#15664f" fillOpacity="0.9" />
                <path d="M0 96 C 100 46, 200 66, 310 130 C 350 154, 380 176, 400 190" fill="none" stroke="#fbbf24" strokeWidth="4" />
            </svg>

            {/* Nakapirmi ang card sa itaas (hindi naka-gitna): kapag may lumabas na error,
                pababa lang ito hahaba at hindi gagalaw ang logo, pamagat at mga field */}
            <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center gap-6 px-4 pb-6 pt-10 sm:px-8 sm:pt-[10vh]">
                {/* Logo */}
                <span className="relative block drop-shadow-[0_18px_24px_rgba(16,82,63,0.4)]">
                    <Image
                        src="/bcas.jpg"
                        alt="BCAS logo"
                        width={160}
                        height={160}
                        priority
                        className="block h-20 w-20 rounded-full bg-white object-cover [clip-path:circle(49%)] sm:h-24 sm:w-24"
                    />
                </span>

                {/* CARD: kapareho ng Log In card */}
                <section className="relative w-full max-w-[440px] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl shadow-[#15664f]/15 sm:p-10">
                    <span aria-hidden className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#4f9a7c]/80" />
                    <span aria-hidden className="absolute -right-6 -top-20 h-24 w-24 rounded-full bg-[#15664f]/20" />

                    <div className="relative">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">{eyebrow}</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10523f] sm:text-4xl">{title}</h1>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600">{subtitle}</p>
                        <div className="mt-8">{children}</div>
                    </div>
                </section>

                <p className="relative z-10 mt-auto rounded-full bg-white/70 px-3 py-1 text-center text-sm text-gray-600 backdrop-blur-sm">© {year} Batangas College of Arts and Sciences · School Clinic</p>
            </div>
        </main>
    );
}