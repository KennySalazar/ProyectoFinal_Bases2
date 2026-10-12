export const textoVisible = (texto) => typeof texto === "string" ? texto.replace(/\bAnios\b/g, "Años").replace(/\banios\b/g, "años").replace(/\bAnio\b/g, "Año").replace(/\banio\b/g, "año") : texto;
