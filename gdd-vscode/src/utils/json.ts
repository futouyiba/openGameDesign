export function parseJSON(text: string): any {
  const trimmed = text.trim();

  // Remove markdown code blocks if present
  const jsonMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  return JSON.parse(trimmed);
}
