// Guarda el "challenge" de WebAuthn entre el paso de opciones y el de
// verificación (registro o login) en una cookie httpOnly de corta
// duración — no hace falta más estado en el servidor para esto.
export const WEBAUTHN_COOKIE = "wa_challenge";
export const WEBAUTHN_COOKIE_MAX_AGE = 300; // 5 minutos
