import Image from "next/image";

// Kaparehong layout ng Login: buong campus photo sa background,
// at naka-float na card sa ibabaw. Ginagamit ng Forgot Password at Enter Code.

// Dark green na input, bagay sa card. May "!" para manalo laban sa global placeholder color sa globals.css.
export const authInputClass =
    "h-12 w-full rounded-full border! border-white/40! bg-[#0f3a2c] px-5 text-base text-white outline-none transition-colors placeholder:text-white/60! hover:border-white/60! hover:bg-[#0c3226] focus:border-amber-300! focus:bg-[#0c3226] focus:ring-2 focus:ring-amber-300/30 md:text-sm";

export const authButtonClass =
    "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-4 text-base font-semibold text-[#0b2a20] shadow-lg shadow-black/20 transition-all hover:from-amber-300 hover:to-amber-200 hover:shadow-amber-400/30 active:scale-[0.99] disabled:opacity-60";

export default function AuthShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: React.ReactNode;
    children: React.ReactNode;
}) {
    const year = new Date().getFullYear();

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#1a5240]">
            {/* BACKGROUND: buong campus photo, malinaw at buhay ang kulay */}
            <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-[position:30%_center] brightness-105 saturate-[1.15] max-lg:scale-110 max-lg:blur-[3px] lg:bg-center"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
            {/* Bahagyang dilim lang sa kaliwa at ibaba para lumutang ang card at mabasa ang text */}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
            {/* Phone/tablet: green na takip para malinis tingnan ang pinalaking photo at lumutang ang card */}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#0f3a2c]/40 via-[#1a5240]/35 to-[#0f3a2c]/70 lg:hidden" />

            <div className="relative flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-16 xl:px-24">
                <div className="flex flex-1 items-center justify-center lg:justify-between lg:gap-12">
                    {/* FLOATING CARD */}
                    <section className="w-full max-w-[26.5rem] rounded-3xl border border-white/15 bg-[#1a5240]/90 px-6 pb-6 pt-8 shadow-2xl shadow-black/40 backdrop-blur-md sm:px-8 sm:pb-7 sm:pt-10">
                        {/* Brand */}
                        <div className="flex items-center gap-3">
                            <Image
                                src="/bcas.jpg"
                                alt="BCAS logo"
                                width={96}
                                height={96}
                                priority
                                className="h-12 w-12 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/30"
                            />
                            <div className="leading-tight">
                                <p className="text-sm font-bold tracking-wide text-white">BCAS CLINIC</p>
                                <p className="text-xs text-white/70">Health Record System</p>
                            </div>
                        </div>

                        <h1 className="mt-7 text-3xl font-bold tracking-tight text-white">{title}</h1>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/70">{subtitle}</p>
                        <div className="mt-7">{children}</div>
                    </section>

                    {/* Tagline sa kanang-ibaba (desktop lang) */}
                    <div className="hidden max-w-md self-end pb-4 text-left lg:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 drop-shadow">School Clinic</p>
                        <p className="mt-2 text-3xl font-bold leading-snug text-white drop-shadow-lg">
                            Caring for the health of every BCAS student and employee.
                        </p>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-white/80 drop-shadow lg:text-left">
                    © {year} Batangas College of Arts and Sciences · School Clinic
                </p>
            </div>
        </main>
    );
}