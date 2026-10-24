import Image from "next/image";

// Kaparehong layout ng Login: madilim na green sa kaliwa (nasa gitna ang laman),
// campus photo sa kanan (desktop lang). Ginagamit ng Forgot Password at Enter Code.

export const authInputClass =
    "h-12 w-full rounded-full border border-white/35 bg-transparent px-5 text-base text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/60 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 md:text-sm";

export const authButtonClass =
    "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 text-base font-semibold text-[#0b2a20] shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300 active:scale-[0.99] disabled:opacity-60";

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
        <main className="grid min-h-screen bg-[#0b2a20] lg:grid-cols-2 lg:p-3">
            <section className="relative flex min-h-screen flex-col items-center px-4 py-4 text-center sm:px-8 sm:py-6 lg:min-h-0 lg:px-12 lg:py-8 xl:px-20">
                {/* Phone/tablet: banner na may campus photo at logo (kapareho ng Login) */}
                <div
                    className="relative h-44 w-full shrink-0 overflow-hidden rounded-3xl bg-cover bg-center text-left sm:h-56 lg:hidden"
                    style={{ backgroundImage: "url('/bg.jpg')" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a20] via-[#0b2a20]/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-5">
                        <Image
                            src="/bcas.jpg"
                            alt="BCAS logo"
                            width={96}
                            height={96}
                            priority
                            className="h-12 w-12 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/40"
                        />
                        <div className="leading-tight">
                            <p className="text-base font-bold tracking-wide text-white">BCAS CLINIC</p>
                            <p className="text-xs text-white/80">Health Record System</p>
                        </div>
                    </div>
                </div>

                {/* Desktop: brand sa itaas */}
                <div className="hidden items-center gap-3 text-left lg:flex">
                    <Image
                        src="/bcas.jpg"
                        alt="BCAS logo"
                        width={96}
                        height={96}
                        priority
                        className="h-11 w-11 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/20"
                    />
                    <div className="leading-tight">
                        <p className="text-sm font-bold tracking-wide text-white">BCAS CLINIC</p>
                        <p className="text-xs text-white/60">Health Record System</p>
                    </div>
                </div>

                {/* Laman, nasa gitna */}
                <div className="flex w-full flex-1 items-center justify-center px-2 py-8 lg:py-10">
                    <div className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
                        <p className="mt-2 text-sm text-white/70">{subtitle}</p>
                        <div className="mt-8 text-left">{children}</div>
                    </div>
                </div>

                <p className="text-xs text-white/60">© {year} Batangas College of Arts and Sciences · School Clinic</p>
            </section>

            {/* Campus photo (desktop lang) */}
            <section
                aria-hidden
                className="relative hidden overflow-hidden rounded-3xl bg-cover bg-center lg:block"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
        </main>
    );
}