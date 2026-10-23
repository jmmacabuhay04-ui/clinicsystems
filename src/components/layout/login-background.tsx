export default function LoginBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Campus photo (malinaw) */}
            <div
                aria-hidden
                className="fixed inset-0 z-0 scale-105 bg-cover bg-center"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
            {/* Dark green gradient */}
            <div
                aria-hidden
                className="fixed inset-0 z-0 bg-gradient-to-br from-[#062b20]/80 via-[#0f4d3b]/55 to-[#15664f]/30"
            />
            {/* Malalambot na kulay (glow) para sa modern na itsura */}
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-400/25 blur-3xl" />
                <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-amber-400/20 blur-3xl" />
            </div>
            {/* Shadow sa ibaba para may lalim */}
            <div
                aria-hidden
                className="fixed inset-0 z-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
            />

            {/* Login page sa ibabaw. Ginagawang transparent ang lumang background nito para kita ang photo */}
            <div className="relative z-10 [&>*]:bg-transparent! [&>*]:bg-none!">{children}</div>
        </div>
    );
}