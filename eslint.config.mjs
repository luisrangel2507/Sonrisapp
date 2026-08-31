import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],
  },
  {
    rules: {
      // Reglas nuevas del upgrade a Next 16 (eslint-plugin-react-hooks v7,
      // pensadas para el ecosistema del React Compiler). Se dejan en
      // warning en vez de error para no bloquear el lint con 70+
      // hallazgos sobre código ya probado, sin perder la señal para
      // limpiarlo a futuro:
      // - set-state-in-effect: marca "cargar datos en un useEffect al
      //   montar", un patrón usado en toda la app.
      // - error-boundaries: marca cualquier JSX dentro de un try/catch,
      //   incluido el de las rutas de PDF (@react-pdf/renderer corre en
      //   el servidor — ahí no aplican los error boundaries de React).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/error-boundaries": "warn",
    },
  },
]);