import Image from "next/image";

/** School header — hidden on screen, shown only when printing. */
export default function PrintHeader() {
    return (
        <div className="hidden text-center text-black print:block">
            <Image
                src="/bcas.jpg"
                alt="BCAS logo"
                width={80}
                height={80}
                loading="eager"
                className="mx-auto h-20 w-20 rounded-full object-cover"
            />
            <p className="mt-2 text-lg font-bold uppercase">
                Batangas College of Arts and Sciences
            </p>
            <p className="text-sm">School Clinic</p>
        </div>
    );
}