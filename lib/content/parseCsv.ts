/** Minimal CSV parser for quoted fields. Enough for workshop content files. */

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitRows(text.trim());
  if (rows.length < 2) return [];

  const headers = splitRow(rows[0]!).map((h) => h.trim());
  const missing = headers.findIndex((h) => !h);
  if (missing !== -1) {
    throw new Error(`CSV header is missing a column name at index ${missing}`);
  }

  return rows.slice(1).filter(Boolean).map((line, rowIndex) => {
    const cells = splitRow(line);
    if (cells.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${cells.length} columns; expected ${headers.length}`,
      );
    }
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? "";
    });
    return record;
  });
}

function splitRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      rows.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) rows.push(current);
  return rows;
}

function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

export function requireFields(
  row: Record<string, string>,
  fields: string[],
  label: string,
): void {
  for (const field of fields) {
    if (!row[field]?.trim()) {
      throw new Error(`${label} is missing required field "${field}"`);
    }
  }
}
