// Tinitingnan kung tugma ang file name sa pangalan ng estudyante.
// Tugma kung nasa file name ang first name at ang huling salita ng last name (hal. "vega").
function words(s: string) {
    return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

export function fileNameMatchesStudent(fileName: string, firstName: string, lastName: string): boolean {
    const file = words(fileName);
    const first = words(firstName).trim();
    const lastWord = words(lastName).trim().split(" ").pop() ?? "";
    if (!first || !lastWord) return false;
    return file.includes(` ${first} `) && file.includes(` ${lastWord} `);
}