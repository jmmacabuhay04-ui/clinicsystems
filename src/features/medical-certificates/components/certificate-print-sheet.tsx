import PrintHeader from "@/components/layout/print-header";

export type CertificateData = {
    name: string;
    ageSex: string;
    issued: string;
    diagnosis: string;
    purpose: string;
    remarks: string;
};

// Print copy ng clinic certificate: gamit ang PrintHeader ng school. Nakatago sa screen, lumalabas lang sa print.
export default function CertificatePrintSheet({ data }: { data: CertificateData }) {
    return (
        <div id="clinic-certificate-print" className="hidden text-black print:block">
            <style>{`@media print {
                @page { size: A4; margin: 20mm; }
                body * { visibility: hidden; }
                #clinic-certificate-print, #clinic-certificate-print * { visibility: visible; }
                #clinic-certificate-print { position: absolute; left: 0; top: 0; width: 100%; }
            }`}</style>

            <PrintHeader />

            <h2 className="mt-10 text-center text-2xl font-bold">Health Clinic</h2>
            <p className="mt-6 text-right text-[15px]">DATE: {data.issued}</p>
            <h1 className="mt-8 text-center text-xl font-bold tracking-wide">MEDICAL CERTIFICATE</h1>

            <div className="mt-10 space-y-5 text-[15px] leading-relaxed">
                <p>
                    This is to certify that Mr. / Mrs. <span className="font-semibold">{data.name}</span>
                </p>
                <p>
                    Age / Sex: <span className="font-semibold">{data.ageSex}</span> has been seen and examined on{" "}
                    <span className="font-semibold">{data.issued}</span>
                    {data.diagnosis ? (
                        <>
                            {" "}and was diagnosed to have <span className="font-semibold">{data.diagnosis}</span>
                        </>
                    ) : null}
                    .
                </p>
                <p>
                    I therefore recommend <span className="font-semibold">{data.remarks || "None"}</span>.
                </p>
                <p className="pt-2 text-sm leading-relaxed">
                    This certificate is being issued upon the request of the above mentioned name for {data.purpose} (excluding legal
                    matters).
                </p>
            </div>

            <div className="mt-28 flex justify-end">
                <div className="w-64 text-center">
                    <div className="border-t border-black" />
                    <p className="mt-1 text-sm font-bold">MEDICAL CONSULTANT PHYSICIAN</p>
                </div>
            </div>
        </div>
    );
}