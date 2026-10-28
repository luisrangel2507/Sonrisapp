// Caché sencilla del lado del navegador para que las pantallas no
// arranquen vacías ("Cargando…") cada vez que se visitan: se muestra lo
// último que se vio al instante y se actualiza en segundo plano.
//
// - En memoria (Map): sobrevive mientras la app siga abierta, incluso al
//   cambiar de pantalla; se pierde al recargar. Vacía en el primer render
//   del servidor y del cliente, así que no causa errores de hidratación.
// - En sessionStorage (solo perfil/marca): datos chicos que pintan la
//   cabecera, para que no "salten" al recargar.
const memoria = new Map<string, unknown>();

export function leerCache<T>(clave: string): T | null {
  return (memoria.get(clave) as T | undefined) ?? null;
}

export function guardarCache<T>(clave: string, valor: T) {
  memoria.set(clave, valor);
}

export function borrarCache(prefijo = "") {
  for (const k of Array.from(memoria.keys())) if (k.startsWith(prefijo)) memoria.delete(k);
}

export function leerSesion<T>(clave: string): T | null {
  try {
    const v = window.sessionStorage.getItem("c:" + clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function guardarSesion<T>(clave: string, valor: T) {
  try {
    window.sessionStorage.setItem("c:" + clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento: no pasa nada, solo se pide de nuevo
  }
}
