"use client";

// Search box ng mga listahan (form na method="get").
// Kapag binura ang lahat ng tinype (naging blangko), kusang nire-reset ang listahan:
// isinusubmit ang form nang walang search, kaya bumabalik ang buong listahan.
// Pindutin pa rin ang Enter para mag-search gaya ng dati.
type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function SearchInput(props: Props) {
    return (
        <input
            type="search"
            {...props}
            onChange={(e) => {
                props.onChange?.(e);
                if (e.currentTarget.value.trim() === "") e.currentTarget.form?.requestSubmit();
            }}
            suppressHydrationWarning
        />
    );
}