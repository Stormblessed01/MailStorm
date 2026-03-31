export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}

export function normalizeRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim()] = (value ?? "").trim();
  }
  return normalized;
}
