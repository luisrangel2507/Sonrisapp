// Consejos de higiene bucal para la pantalla de la sala de espera. Texto
// corto y general (sin promesas de resultados ni marcas).
export interface Consejo {
  titulo: string;
  texto: string;
}

export const CONSEJOS_HIGIENE: Consejo[] = [
  { titulo: "Cepíllate 2 minutos", texto: "Dos veces al día, por lo menos dos minutos cada vez. Dedica unos segundos a cada zona de tu boca." },
  { titulo: "Cepillo suave", texto: "Usa un cepillo de cerdas suaves y hazlo con movimientos circulares y sin presionar fuerte para cuidar tus encías." },
  { titulo: "Cambia tu cepillo", texto: "Cámbialo cada 3 meses, o antes si las cerdas se ven abiertas o desgastadas. Tampoco lo compartas." },
  { titulo: "No olvides el hilo dental", texto: "El hilo limpia entre los dientes, donde el cepillo no llega. Úsalo una vez al día, de preferencia por la noche." },
  { titulo: "Limpia tu lengua", texto: "Pasa el cepillo o un limpiador de lengua con suavidad. Ayuda a reducir el mal aliento." },
  { titulo: "Pasta con flúor", texto: "El flúor fortalece el esmalte y ayuda a prevenir las caries. Basta una cantidad del tamaño de un chícharo." },
  { titulo: "Menos azúcar, menos caries", texto: "No es solo cuánta azúcar comes, sino cuántas veces al día. Los refrescos y dulces frecuentes dañan el esmalte." },
  { titulo: "Toma agua", texto: "Después de comer, enjuágate con agua. Mantenerte hidratado ayuda a que tu boca produzca saliva, que la protege." },
  { titulo: "Antes de dormir", texto: "Cepillarte por la noche es lo más importante: mientras duermes, la boca produce menos saliva y las bacterias se multiplican." },
  { titulo: "Revisión cada 6 meses", texto: "Una visita de control y limpieza dos veces al año detecta problemas a tiempo, cuando el tratamiento es más sencillo." },
  { titulo: "Si sangran tus encías", texto: "No dejes de cepillarte: suele ser inflamación por placa. Si continúa más de unos días, coméntalo con tu dentista." },
  { titulo: "No uses tus dientes de herramienta", texto: "Abrir envolturas, morder lápices o romper hielo puede fracturar tus dientes." },
  { titulo: "Cuidado con tus brackets", texto: "Cepíllate después de cada comida y usa el cepillo interdental. Evita alimentos duros o muy pegajosos." },
  { titulo: "Cuida a los más pequeños", texto: "Ayuda a los niños a cepillarse hasta que tengan unos 8 años y llévalos al dentista desde que salen sus primeros dientes." },
  { titulo: "Dientes sensibles", texto: "Si el frío, el calor o lo dulce te molestan, avísanos. Hay tratamientos y pastas que ayudan." },
  { titulo: "Tabaco y salud bucal", texto: "Fumar mancha los dientes, causa mal aliento y aumenta el riesgo de enfermedad de las encías." },
];
