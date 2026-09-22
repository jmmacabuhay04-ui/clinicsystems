export default function LoginBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Campus photo */}
            <div
                aria-hidden
                className="fixed inset-0 z-0 scale-105 bg-cover bg-center"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
            {/* Dark green gradient (semi-transparent so the photo still shows) */}
            <div
                aria-hidden
                className="fixed inset-0 z-0 bg-gradient-to-br from-[#0b3d2e]/90 via-[#15664f]/65 to-[#0b3d2e]/40"
            />
            {/* Soft shadow at the bottom for depth */}
            <div
                aria-hidden
                className="fixed inset-0 z-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            />

            {/* Login page on top. Its old plain background is made transparent so the photo shows through */}
            <div className="relative z-10 [&>*]:bg-transparent! [&>*]:bg-none!">{children}</div>
        </div>
    );
}