// Background ng login page: madilim na green. Ang campus photo ay nasa kanang kalahati,
// na inaayos na mismo ng login page.
export default function LoginBackground({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-[#0b2a20]">{children}</div>;
}