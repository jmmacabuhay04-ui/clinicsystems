// Background ng login page: mint green, kapareho ng dashboard. Ang campus photo ay nasa kanang bahagi,
// na inaayos na mismo ng login page.
export default function LoginBackground({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-[#e7f3e2]">{children}</div>;
}