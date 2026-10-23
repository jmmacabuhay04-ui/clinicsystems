"use client";

// Input (hal. date) na kusang nagse-submit ng form kapag nagbago ang value.
type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function AutoSubmitInput(props: Props) {
    return (
        <input
            {...props}
            onChange={(e) => {
                props.onChange?.(e);
                e.currentTarget.form?.requestSubmit();
            }}
            suppressHydrationWarning
        />
    );
}