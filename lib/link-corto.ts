const TIMEOUT_MS = 5000;

async function fetchConTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Acorta un link con is.gd y, si falla, con TinyURL — ninguno de los
// dos necesita API key. Si ambos fallan (servicio caído, sin salida a
// internet, etc.) regresa null y quien llame debe usar el link completo.
export async function acortarLink(url: string): Promise<string | null> {
  try {
    const res = await fetchConTimeout(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    const texto = (await res.text()).trim();
    if (res.ok && texto.startsWith("https://is.gd/")) return texto;
  } catch {
    // sigue con el siguiente servicio
  }
  try {
    const res = await fetchConTimeout(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const texto = (await res.text()).trim();
    if (res.ok && texto.startsWith("https://tinyurl.com/")) return texto;
  } catch {
    // ambos fallaron
  }
  return null;
}
