/** Resolves a public asset against Vite's configured deployment base path. */
export function publicAssetUrl(path: string, baseUrl = import.meta.env.BASE_URL): string {
  const relativePath = path.replace(/^\/+/, "");
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${relativePath}`;
}
