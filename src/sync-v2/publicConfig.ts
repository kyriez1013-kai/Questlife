export function isPublicSupabaseKey(key?: string): boolean {
  if (!key) return false;
  if (key.startsWith("sb_publishable_")) return true;
  try {
    const part = key.split(".")[1];
    if (!part) return false;
    const encoded = part.replace(/-/g, "+").replace(/_/g, "/");
    return (
      JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")))
        .role === "anon"
    );
  } catch {
    return false;
  }
}
