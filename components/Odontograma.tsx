"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import {
  ARCO_SUPERIOR,
  ARCO_INFERIOR,
  ESTADO_DIENTE,
  type EstadoDiente,
  type HistorialDental,
} from "@/lib/dental";
import type { Paciente } from "@/lib/types";
import { fechaSoloDia } from "@/lib/fechas";

// Arco inferior en orden de despliegue (espejo del arco superior para
// que cada diente quede alineado en vertical con su pareja de arriba).
const ARCO_INFERIOR_VISUAL = [...ARCO_INFERIOR].reverse();

function formatearFecha(fecha: string) {
  return fechaSoloDia(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// Silueta real de cada diente sobre odontograma-hud.jpg — trazada a
// partir de 32 fotos de referencia (una por diente, contorneada a
// mano) en vez de un cuadro aproximado. Puntos en % del ancho/alto de
// la imagen, listos para un <polygon points="..."> con viewBox 0 0 100 100.
const POLIGONOS_DIENTE: Record<number, string> = {
  11: "44.01,15.995 43.294,17.054 42.578,18.855 41.602,22.88 41.276,26.27 41.276,31.248 41.016,31.566 41.732,32.943 42.969,33.791 47.331,33.791 49.87,33.049 50.065,32.731 50.065,24.469 49.74,24.363 48.763,20.02 47.982,17.902 46.484,15.889 45.573,15.465 44.987,15.465",
  12: "37.174,16.207 37.174,16.842 36.458,17.902 35.677,20.02 35.091,22.562 34.896,25.211 34.896,28.918 35.026,29.342 35.156,31.248 35.677,32.308 36.328,32.731 37.174,32.943 39.258,32.943 39.909,32.731 40.951,32.096 41.146,31.672 41.276,29.977 41.211,25.952 41.471,24.681 41.406,23.198 40.951,21.503 39.518,17.902 38.932,16.948 38.411,16.419 37.565,16.101",
  13: "30.339,17.902 29.818,19.173 29.492,20.762 29.167,24.151 29.167,28.918 29.427,30.825 30.208,33.155 30.794,33.261 31.25,33.897 31.641,34.214 31.966,34.214 32.747,33.685 33.724,32.202 34.115,31.778 34.57,31.672 35.091,30.613 35.352,30.507 35.352,30.189 35.091,29.659 35.091,25.316 34.831,25.105 34.831,24.469 33.594,21.291 33.594,20.02 33.203,20.02 32.943,19.596 32.812,18.961 32.161,18.008",
  14: "25.13,19.808 24.674,20.232 24.284,22.139 24.023,24.363 23.958,28.282 23.828,28.6 23.828,30.083 24.089,30.931 24.089,31.248 24.609,32.519 26.107,34.532 27.279,34.32 27.669,34.002 27.865,33.579 27.865,33.261 28.06,32.837 28.06,32.414 28.255,32.096 29.102,31.778 29.622,31.142 29.622,29.554 29.362,28.494 29.232,26.164 28.841,24.681 28.581,24.257 28.19,22.986 27.344,21.185 26.497,20.126 26.367,20.126 26.302,19.808",
  15: "20.768,21.927 20.443,22.245 20.052,23.516 19.857,24.575 19.727,26.799 19.531,27.859 19.531,31.46 19.922,33.261 20.378,34.532 20.898,35.168 21.419,35.485 22.135,35.485 22.331,35.168 23.112,35.168 23.698,36.015 24.089,36.333 24.479,36.333 24.674,36.545 24.87,36.439 25.586,35.591 25.911,34.32 25.13,33.049 24.544,31.778 24.544,31.354 24.349,30.825 23.893,28.282 23.893,25.846 22.917,24.151 22.852,23.834 22.201,23.092 21.745,22.245 21.354,21.927",
  16: "16.862,23.728 16.536,25.211 16.406,27.647 16.276,28.071 16.211,30.931 16.406,33.367 16.797,34.426 16.797,34.744 18.099,36.333 18.49,36.121 19.596,36.121 20.573,36.757 21.354,38.028 22.526,38.028 23.177,36.333 23.633,36.121 23.242,35.697 23.047,34.85 22.656,34.108 21.875,35.274 21.094,35.274 20.312,34.32 20.117,33.897 20.117,33.367 19.987,33.049 19.857,29.659 19.727,29.024 19.727,27.011 19.336,26.905 17.383,23.622",
  17: "14.583,25.211 13.802,27.541 13.737,28.918 13.802,33.155 13.932,33.473 14.062,34.638 14.583,36.545 14.779,36.757 15.625,36.862 16.667,36.757 17.318,38.134 17.383,38.663 17.969,39.405 19.401,39.299 19.922,38.981 20.898,36.968 20.443,36.968 19.727,35.591 19.271,35.274 18.945,35.274 18.359,36.015 17.383,35.909 17.057,35.062 16.992,34.32 16.602,33.579 16.471,31.99 16.341,31.672 16.341,30.931 16.211,30.507 16.211,29.765 16.081,29.554 16.081,28.071 15.69,26.799 15.56,25.952 15.169,25.105",
  18: "13.281,24.999 12.76,26.482 12.5,27.647 12.24,29.659 12.24,31.142 12.109,31.354 11.979,32.837 11.979,35.697 12.109,36.757 12.5,37.922 12.956,38.557 13.216,38.769 13.997,38.769 14.714,39.934 15.43,40.04 15.495,40.358 15.951,40.252 16.341,39.934 16.927,39.087 17.057,38.345 16.992,37.392 16.797,36.968 15.56,36.968 14.974,36.651 14.648,36.227 14.388,34.638 13.997,33.367 13.932,32.308 13.997,25.422 13.737,24.999",
  21: "53.581,15.571 53.581,15.995 52.799,16.842 51.823,18.855 51.042,21.609 50.456,23.092 50.0,25.634 50.0,29.236 50.13,29.765 50.13,32.096 50.26,32.943 50.846,33.261 52.474,33.579 56.836,33.579 57.943,33.261 58.854,31.884 58.724,31.46 58.789,24.151 58.594,20.232 57.747,17.902 57.031,16.419 55.599,15.359 54.102,15.359",
  22: "61.914,16.842 60.612,18.749 60.286,19.596 60.091,20.55 58.789,23.834 58.659,24.469 58.724,30.719 59.375,31.99 60.026,32.414 60.742,32.625 63.086,32.731 63.737,32.519 64.518,31.99 64.779,31.566 64.909,30.401 65.039,30.295 65.104,27.435 64.974,22.774 64.518,20.126 63.737,17.478 63.411,16.948 63.151,16.842",
  23: "69.792,18.113 68.685,18.113 67.708,19.067 66.341,21.291 65.495,23.622 65.039,24.257 65.169,25.74 65.104,29.448 64.909,29.977 64.974,30.507 65.755,31.884 66.341,32.308 67.057,33.579 67.578,34.002 68.685,33.897 69.661,32.519 69.792,32.519 70.117,31.99 70.768,29.765 70.768,28.918 70.898,28.6 70.898,27.647 71.029,27.117 70.964,23.622 70.312,19.596",
  24: "74.87,20.02 74.414,19.808 73.763,19.914 72.917,21.291 72.917,21.503 71.875,23.41 70.964,24.681 70.833,25.105 70.964,25.952 70.964,28.176 70.833,28.494 70.833,29.024 70.443,30.295 70.182,31.672 69.661,32.625 70.312,34.214 70.964,35.168 71.549,35.168 72.396,34.638 74.023,34.744 74.544,34.108 75.586,31.778 75.846,30.083 75.911,28.706 75.911,24.681 75.456,20.762",
  25: "79.492,21.927 78.711,21.927 78.255,22.351 77.344,24.045 75.977,26.058 75.977,29.554 75.651,31.566 74.74,33.579 74.089,34.426 74.089,34.956 74.284,35.591 74.805,36.333 75.456,36.439 76.432,35.697 76.628,35.697 77.018,35.274 79.232,35.274 79.557,35.062 79.622,34.744 79.818,34.532 80.013,33.897 80.143,32.414 80.404,31.248 80.404,30.401 80.534,29.659 80.534,27.223 80.339,26.27 80.078,23.622 79.818,22.456",
  26: "83.138,23.834 82.422,23.834 81.836,24.787 81.055,26.588 80.339,27.435 80.469,27.647 80.469,30.189 80.339,30.613 80.339,31.248 80.208,31.46 80.208,32.096 79.557,34.426 79.102,35.168 77.734,35.168 77.539,34.85 77.083,34.744 76.628,35.38 76.562,35.909 77.018,37.074 77.604,38.028 78.841,37.816 80.143,36.651 80.143,36.439 80.404,36.121 81.185,36.121 81.315,36.333 82.487,36.333 83.398,34.638 83.659,33.261 83.659,32.625 83.789,32.308 83.789,31.46 83.919,31.142 83.919,29.659 83.659,26.376 83.333,24.681 83.138,24.257",
  27: "85.221,25.528 84.961,25.634 84.44,26.376 84.375,26.799 83.724,27.965 83.724,31.778 83.594,32.414 83.594,33.155 83.333,34.214 82.943,34.956 82.812,35.697 82.422,36.121 81.25,36.121 80.534,35.591 79.818,36.439 79.297,37.498 79.753,38.663 80.404,39.511 80.859,39.723 81.38,39.723 82.617,39.087 83.138,38.134 83.138,37.71 83.333,37.18 83.789,36.968 84.766,36.968 84.961,36.757 85.286,36.757 85.612,36.227 85.612,35.697 85.872,34.744 86.003,34.638 86.003,33.897 86.133,33.367 86.133,31.46 86.003,31.248 86.003,29.659 85.872,28.6 85.482,26.799 85.482,26.376 85.352,26.164 85.352,25.74",
  28: "86.849,24.999 86.523,25.316 86.328,26.376 86.068,26.799 86.003,27.223 86.068,29.342 86.263,30.295 86.263,31.672 85.807,34.32 85.807,35.168 85.677,35.803 85.352,36.439 84.831,36.968 83.724,36.968 82.943,37.286 82.812,37.71 82.812,38.769 83.008,39.087 83.984,39.617 84.961,39.828 85.872,39.511 86.198,38.663 86.784,38.663 87.109,38.451 87.826,36.333 88.086,34.956 88.151,32.943 88.086,31.778 87.695,29.765 87.63,27.753 87.37,25.952",
  31: "50.456,66.628 49.87,67.687 49.87,70.865 50.13,72.772 50.13,73.619 50.977,77.432 51.107,78.704 51.497,79.551 52.148,80.504 52.604,80.928 53.646,81.034 54.102,80.822 54.622,79.763 55.664,75.738 55.729,74.466 56.185,71.395 56.185,67.475 55.729,66.522 55.404,66.31 51.823,66.204",
  32: "56.966,66.204 56.51,66.84 56.12,68.111 55.99,73.619 56.445,75.102 56.706,75.526 57.227,78.068 57.682,79.551 58.138,80.398 58.398,80.61 59.57,80.716 60.742,79.763 61.263,78.492 61.589,77.221 61.849,74.572 62.109,73.195 62.109,72.454 62.305,71.818 62.24,66.734 61.914,66.204 61.328,66.098",
  33: "65.625,64.615 65.039,64.827 63.672,65.886 63.021,66.098 62.109,67.052 62.109,68.005 61.979,68.64 61.979,72.666 62.109,73.513 62.305,73.725 62.76,75.208 64.062,78.174 65.039,79.763 65.69,80.292 66.211,80.292 66.667,79.975 67.383,78.704 67.708,77.221 67.969,75.314 67.969,74.149 68.164,72.136 68.164,69.806 67.839,67.052 67.578,66.098 66.536,64.721",
  34: "69.336,61.861 68.62,63.026 67.448,65.675 67.448,66.734 67.643,67.052 67.969,68.958 67.969,71.818 68.815,72.983 69.466,74.466 69.661,75.208 70.312,76.373 70.638,76.691 71.81,77.115 72.331,77.009 72.786,76.479 72.982,74.89 73.177,74.255 73.242,68.323 72.852,65.357 72.266,63.45 70.247,61.861",
  35: "72.135,59.425 71.875,59.743 71.875,60.06 71.484,61.226 70.964,62.285 71.224,62.709 71.419,62.709 72.005,63.238 72.786,65.145 73.047,66.416 73.047,68.429 72.917,68.64 73.047,69.594 74.219,71.183 75.0,72.983 75.586,73.831 75.846,74.043 77.409,73.937 77.865,72.666 77.995,71.818 77.995,68.323 77.865,67.793 77.734,63.556 77.539,62.391 77.148,61.12 76.823,60.378 76.628,60.59 75.391,60.59 73.958,59.531 73.307,59.319",
  36: "74.479,56.035 73.893,57.094 73.438,58.577 73.568,59.955 74.414,60.378 76.302,60.378 76.758,60.802 77.474,62.603 77.865,64.721 77.865,65.78 77.995,66.098 78.06,67.052 78.711,67.687 79.427,68.852 80.208,69.594 81.12,69.594 81.641,68.429 81.901,65.78 81.836,61.967 81.576,60.484 80.599,57.2 80.013,56.565 77.604,56.883 76.107,55.929",
  37: "76.497,53.387 75.781,55.294 75.781,55.717 75.977,56.035 76.888,56.459 77.799,57.306 78.255,57.306 78.776,56.671 80.143,56.671 80.469,57.2 81.25,59.425 81.771,62.073 81.771,63.556 82.487,63.98 82.943,64.827 83.268,65.039 84.245,64.933 84.896,64.086 85.221,62.709 85.352,61.014 85.286,58.789 84.961,56.565 84.57,55.188 83.594,52.751 83.203,52.116 82.161,52.116 81.055,52.751 80.599,53.387 79.818,53.387 79.232,52.751 78.776,52.54 77.148,52.54",
  38: "78.06,50.739 77.734,52.54 79.232,52.54 79.883,53.387 81.055,53.281 82.031,52.328 82.878,52.328 83.333,52.646 84.115,53.811 84.375,54.552 84.505,55.506 84.896,56.777 84.896,57.306 85.612,57.624 86.328,58.26 86.849,58.154 87.174,56.777 87.174,54.87 87.63,54.658 87.891,54.234 87.956,51.586 87.826,50.315 87.695,50.209 87.63,49.68 86.523,46.396 86.068,45.548 85.677,45.337 84.375,45.337 83.789,45.972 83.008,45.972 81.966,45.548 80.99,45.654 80.469,46.078 79.948,46.926 79.557,48.091 79.557,49.15 78.711,49.68",
  41: "44.401,66.522 44.01,67.052 43.88,67.475 43.88,70.441 44.206,72.454 44.336,74.149 44.466,74.572 44.466,75.314 44.596,75.632 44.727,76.691 45.312,78.809 46.094,80.398 47.07,81.034 47.461,80.928 47.721,80.61 48.177,80.398 48.503,79.975 48.893,78.809 49.544,75.949 49.805,73.725 49.87,66.84 48.568,66.628 48.177,66.416",
  42: "38.346,65.992 38.086,66.416 37.891,67.581 37.891,71.183 38.086,73.619 38.346,74.572 38.346,75.526 38.802,78.28 39.193,79.233 40.039,80.398 40.885,80.716 41.732,80.61 42.122,79.975 43.229,75.738 43.815,74.361 44.206,72.666 44.206,71.501 44.076,70.971 44.076,67.263 43.685,66.734 43.034,66.416 42.188,66.416 39.193,65.78 38.737,65.78",
  43: "33.854,64.615 33.398,64.933 33.268,65.251 32.812,65.357 32.357,66.098 32.031,68.64 32.161,73.831 32.487,77.75 32.747,78.598 33.398,79.869 33.854,80.186 35.026,80.081 35.156,79.763 35.352,79.763 35.547,79.339 35.677,79.339 35.742,79.021 36.003,78.704 36.003,78.386 36.263,78.068 36.914,76.161 37.435,75.208 37.435,74.89 37.826,73.619 38.021,73.513 38.086,72.136 38.021,70.441 37.891,70.229 37.76,67.052 36.784,65.992 35.677,65.569 34.505,64.615",
  44: "30.273,61.649 29.557,61.649 29.167,61.861 28.125,62.92 27.669,63.662 27.279,64.615 26.953,66.416 26.758,68.323 26.758,69.382 26.888,69.806 26.888,73.937 27.018,75.42 27.214,76.267 27.474,76.797 28.125,77.115 28.776,77.115 29.427,76.585 31.055,73.301 31.706,72.454 31.836,72.454 31.966,72.03 31.966,68.005 32.227,66.31 32.552,65.78 32.552,65.357 31.771,64.192 31.185,62.497",
  45: "27.669,59.319 27.083,59.213 26.497,59.743 26.042,59.849 25.521,60.484 22.982,60.378 22.526,60.802 22.135,61.861 22.135,62.285 22.005,62.497 21.875,66.946 22.201,71.289 22.461,72.666 22.786,73.513 23.177,73.725 23.958,73.725 24.284,73.513 26.042,70.865 26.172,70.335 26.432,70.018 26.432,69.382 26.758,69.276 26.888,66.628 27.018,66.416 27.214,65.251 27.409,65.039 27.409,64.403 27.539,63.874 28.255,63.026 28.841,62.709 29.102,62.285 28.906,61.649 28.516,61.014 28.32,60.272",
  46: "25.391,56.035 24.87,55.717 24.219,56.141 23.177,56.353 22.526,57.094 21.745,57.094 20.833,56.565 19.857,56.565 19.271,57.094 18.88,58.154 18.88,58.789 18.49,60.802 18.49,61.649 18.099,63.45 18.164,68.005 18.62,69.17 18.815,69.382 19.857,69.276 22.07,66.734 22.07,66.204 22.331,65.357 22.461,64.297 22.461,63.132 22.591,62.285 23.177,61.12 23.763,60.696 24.935,60.696 26.172,59.849 26.628,59.849 26.628,58.895 25.846,56.777",
  47: "23.503,53.387 23.177,52.963 22.461,52.54 21.289,52.751 20.052,53.281 19.206,53.281 18.359,52.328 17.969,52.328 17.773,52.116 16.927,52.116 16.602,52.328 15.755,53.811 15.234,55.082 14.648,58.366 14.648,61.861 14.909,63.238 15.625,64.933 16.536,65.039 17.578,64.192 17.969,63.662 18.424,62.391 18.424,61.543 18.815,59.743 18.945,58.472 19.206,57.836 19.206,57.518 19.661,56.671 20.768,56.671 20.898,56.883 21.224,56.883 22.135,57.412 23.698,56.035 24.219,56.035 24.219,55.082",
  48: "12.24,49.997 12.24,53.917 12.435,54.446 12.76,54.658 12.826,56.777 13.216,58.154 13.932,58.048 14.844,57.518 14.909,56.777 15.56,54.446 16.276,53.069 16.667,52.857 16.927,52.434 18.229,52.434 18.62,53.069 19.401,53.493 19.922,53.493 20.312,53.175 21.68,53.069 21.94,52.857 21.81,51.057 20.964,49.468 20.312,49.044 20.247,48.091 19.792,46.714 18.815,45.548 17.643,45.548 16.927,46.078 16.081,46.078 15.495,45.548 14.388,45.548 13.281,46.608",
};

const CENTRO_X_DIENTE: Record<number, number> = {
  11: 45.3, 12: 38.11, 13: 32.58, 14: 26.76, 15: 22.53, 16: 19.61, 17: 16.67, 18: 14.16,
  21: 53.97, 22: 62.28, 23: 68.15, 24: 72.65, 25: 77.91, 26: 80.82, 27: 83.82, 28: 85.9,
  31: 52.89, 32: 59.39, 33: 65.19, 34: 70.33, 35: 74.54, 36: 78.04, 37: 80.94, 38: 83.71,
  41: 46.44, 42: 40.84, 43: 35.3, 44: 29.38, 45: 25.66, 46: 21.98, 47: 19.12, 48: 16.9,
};

// Ícono de diente (corona + raíces) para la vista de carta clínica —
// sin foto, como el formato de ficha que usan los consultorios.
function IconoDiente({ arriba }: { arriba: boolean }) {
  return (
    <svg viewBox="0 0 24 34" width="100%" height="100%" style={arriba ? undefined : { transform: "scaleY(-1)" }}>
      <path
        d="M12 2C7.5 2 3 4.7 3 10c0 4.6 1.7 8.2 2.8 13 .4 2 1.3 4.7 3 4.7 1.4 0 1.9-2 2.3-3.9.3-1.3.6-2.3 1-2.3s.6 1 1 2.3c.4 1.9 1 3.9 2.3 3.9 1.7 0 2.6-2.7 3-4.7C19.3 18.2 21 14.6 21 10c0-5.3-4.5-8-9-8z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CasillaCarta({
  numero,
  arriba,
  estado,
  activo,
  onClick,
}: {
  numero: number;
  arriba: boolean;
  estado: EstadoDiente;
  activo: boolean;
  onClick: () => void;
}) {
  const est = ESTADO_DIENTE[estado];
  const etiqueta = (
    <span className={`text-[9px] font-semibold ${activo ? "text-white" : "text-white/50"}`}>{numero}</span>
  );
  return (
    <button onClick={onClick} aria-label={`Diente ${numero}`} className="flex shrink-0 flex-col items-center gap-1">
      {arriba && etiqueta}
      <div
        style={{
          width: 17,
          height: 26,
          color: est.ring,
          fill: activo ? `rgba(${est.glow},0.55)` : estado === "sano" ? "rgba(255,255,255,0.06)" : `rgba(${est.glow},0.28)`,
          stroke: est.ring,
          strokeWidth: activo ? 1.8 : 1,
          filter: activo ? `drop-shadow(0 0 4px rgba(${est.glow},0.7))` : undefined,
          transition: "filter 0.15s",
        }}
      >
        <IconoDiente arriba={arriba} />
      </div>
      {!arriba && etiqueta}
    </button>
  );
}

function estiloPoligono(estado: EstadoDiente, activo: boolean): CSSProperties {
  const est = ESTADO_DIENTE[estado];
  if (activo) {
    return {
      fill: "rgba(0,0,0,0.42)",
      stroke: est.ring,
      strokeWidth: 0.4,
      filter: `drop-shadow(0 0 2px rgba(${est.glow},0.8))`,
    };
  }
  if (estado === "sano") {
    return { fill: "transparent", stroke: "transparent", strokeWidth: 0 };
  }
  if (estado === "extraido") {
    // Que el diente se vea "apagado" y casi fundido con el fondo de la
    // foto, como si ya no estuviera — en vez de resaltar como las demás
    // condiciones.
    return { fill: "rgba(6,4,14,0.82)", stroke: est.ring, strokeWidth: 0.2 };
  }
  return { fill: `rgba(${est.glow},0.38)`, stroke: est.ring, strokeWidth: 0.25 };
}

// Etiquetas con línea + círculo (como una carta dental) arriba y abajo
// de la foto, para identificar el número de cada diente de un vistazo.
// Los círculos van todos parejos en una sola fila (para que no se vean
// "brincados"); la línea de cada uno viaja en diagonal hasta la
// posición real del diente en la foto.
const ALTURA_ETIQUETAS = 46;
const RADIO_CIRCULO = 8;

function xParejo(indice: number) {
  return ((indice + 0.5) / 16) * 100;
}

function FilaEtiquetas({
  numeros,
  arriba,
  historial,
  seleccionado,
  onSeleccionar,
}: {
  numeros: number[];
  arriba: boolean;
  historial: HistorialDental;
  seleccionado: number;
  onSeleccionar: (n: number) => void;
}) {
  const yCirculo = arriba ? RADIO_CIRCULO + 2 : ALTURA_ETIQUETAS - RADIO_CIRCULO - 2;
  const yLineaInicio = arriba ? yCirculo + RADIO_CIRCULO : yCirculo - RADIO_CIRCULO;
  const yLineaFin = arriba ? ALTURA_ETIQUETAS : 0;

  return (
    <div className="relative" style={{ height: ALTURA_ETIQUETAS }}>
      <svg viewBox={`0 0 100 ${ALTURA_ETIQUETAS}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {numeros.map((n, i) => {
          const est = ESTADO_DIENTE[historial[n]?.estado ?? "sano"];
          const activo = n === seleccionado;
          const color = activo || historial[n]?.estado ? est.ring : "rgba(255,255,255,0.25)";
          return (
            <line
              key={n}
              x1={xParejo(i)}
              y1={yLineaInicio}
              x2={CENTRO_X_DIENTE[n]}
              y2={yLineaFin}
              stroke={color}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {numeros.map((n, i) => {
        const estado = historial[n]?.estado ?? "sano";
        const est = ESTADO_DIENTE[estado];
        const activo = n === seleccionado;
        const circuloEstilo: CSSProperties = activo
          ? { backgroundColor: est.ring, borderColor: est.ring, color: "#15101f" }
          : estado === "sano"
            ? { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.75)" }
            : { backgroundColor: `rgba(${est.glow},0.22)`, borderColor: est.ring, color: est.ring };
        return (
          <button
            key={n}
            onClick={() => onSeleccionar(n)}
            aria-label={`Diente ${n}`}
            className="absolute flex items-center justify-center rounded-full border text-[8px] font-semibold leading-none transition-colors"
            style={{
              left: `${xParejo(i)}%`,
              transform: "translate(-50%, -50%)",
              top: yCirculo,
              width: RADIO_CIRCULO * 2,
              height: RADIO_CIRCULO * 2,
              ...circuloEstilo,
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export function Odontograma({ paciente }: { paciente: Paciente }) {
  const [vista, setVista] = useState<"foto" | "carta">("foto");
  const [seleccionado, setSeleccionado] = useState<number>(16);
  const [historial, setHistorial] = useState<HistorialDental>({});
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [nota, setNota] = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoDiente | "">("");
  const [guardando, setGuardando] = useState(false);

  async function cargarHistorial() {
    setCargando(true);
    const res = await fetch(`/api/pacientes/${paciente.id}/dientes`);
    const data = await res.json();
    setHistorial(data.historial ?? {});
    setCargando(false);
  }

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id]);

  const info = historial[seleccionado];
  const estado = ESTADO_DIENTE[info?.estado ?? "sano"];

  async function agregarRegistro() {
    if (!tipo.trim() || guardando) return;
    setGuardando(true);
    await fetch(`/api/pacientes/${paciente.id}/dientes/${seleccionado}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, nota: nota || null, estado: estadoNuevo || undefined }),
    });
    setTipo("");
    setNota("");
    setEstadoNuevo("");
    setFormAbierto(false);
    setGuardando(false);
    await cargarHistorial();
  }

  function seleccionar(n: number) {
    setSeleccionado(n);
    setFormAbierto(false);
  }

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[28px] border border-white/10 p-5"
        style={{ background: "radial-gradient(circle at 50% 0%, #241a38 0%, #120d1c 65%, #0a0714 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Odontograma clínico</div>
            <div className="text-[13px] text-white/70">
              {paciente.nombre} {paciente.folio ? `· ficha ${paciente.folio}` : ""}
            </div>
          </div>
          <div className="flex rounded-full border border-white/15 bg-white/5 p-0.5 text-[11px]">
            {(["foto", "carta"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  vista === v ? "bg-[#7C5CE0] text-white" : "text-white/50"
                }`}
              >
                {v === "foto" ? "Foto" : "Carta clínica"}
              </button>
            ))}
          </div>
        </div>

        {vista === "foto" ? (
          <div className="relative mt-4">
            <FilaEtiquetas
              numeros={ARCO_SUPERIOR}
              arriba
              historial={historial}
              seleccionado={seleccionado}
              onSeleccionar={seleccionar}
            />

            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/odontograma-hud.jpg"
                alt="Odontograma"
                className="block w-full select-none"
                style={{ aspectRatio: "1300 / 799" }}
                draggable={false}
              />

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                {[...ARCO_SUPERIOR, ...ARCO_INFERIOR_VISUAL].map((n) => (
                  <polygon
                    key={n}
                    points={POLIGONOS_DIENTE[n]}
                    onClick={() => seleccionar(n)}
                    role="button"
                    aria-label={`Diente ${n}`}
                    className="cursor-pointer transition-colors"
                    style={estiloPoligono(historial[n]?.estado ?? "sano", n === seleccionado)}
                  />
                ))}
              </svg>
            </div>

            <FilaEtiquetas
              numeros={ARCO_INFERIOR_VISUAL}
              arriba={false}
              historial={historial}
              seleccionado={seleccionado}
              onSeleccionar={seleccionar}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex w-max justify-center gap-[3px]">
              {ARCO_SUPERIOR.map((n, i) => (
                <div key={n} style={i === 8 ? { marginLeft: 10 } : undefined}>
                  <CasillaCarta
                    numero={n}
                    arriba
                    estado={historial[n]?.estado ?? "sano"}
                    activo={n === seleccionado}
                    onClick={() => seleccionar(n)}
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-white/15" />
            <div className="flex w-max justify-center gap-[3px]">
              {ARCO_INFERIOR_VISUAL.map((n, i) => (
                <div key={n} style={i === 8 ? { marginLeft: 10 } : undefined}>
                  <CasillaCarta
                    numero={n}
                    arriba={false}
                    estado={historial[n]?.estado ?? "sano"}
                    activo={n === seleccionado}
                    onClick={() => seleccionar(n)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
          {Object.entries(ESTADO_DIENTE).map(([key, v]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: v.ring }} />
              <span className="text-[11px] text-white/50">{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#15101f] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Diente {seleccionado} (FDI)
            </div>
            <div className="mt-0.5 text-sm font-medium" style={{ color: estado.ring }}>
              {estado.label}
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold text-white"
            style={{ backgroundColor: `rgba(${estado.glow},0.25)`, border: `1px solid ${estado.ring}` }}
          >
            {cargando ? "…" : `${info?.entradas.length || 0} registro${info?.entradas.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {cargando ? (
            <p className="text-sm text-white/50">Cargando historial…</p>
          ) : info?.entradas?.length ? (
            info.entradas.map((e, i) => (
              <div key={i} className="border-l-2 border-white/10 pl-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90">{e.tipo}</span>
                  <span className="text-[11px] text-white/40">{formatearFecha(e.fecha)}</span>
                </div>
                {e.nota && <p className="mt-0.5 text-[13px] text-white/50">{e.nota}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-white/50">Sin historial registrado — diente sano.</p>
          )}
        </div>

        {formAbierto ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Tipo de tratamiento (ej. Resina)"
              className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
            />
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
            />
            <select
              value={estadoNuevo}
              onChange={(e) => setEstadoNuevo(e.target.value as EstadoDiente | "")}
              className="w-full rounded-xl border border-white/15 bg-[#15101f] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Mantener estado actual</option>
              {Object.entries(ESTADO_DIENTE).map(([key, v]) => (
                <option key={key} value={key}>
                  Cambiar a: {v.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 pt-1">
              <button
                onClick={agregarRegistro}
                disabled={!tipo.trim() || guardando}
                className="flex-1 rounded-full bg-[#7C5CE0] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => setFormAbierto(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/70"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFormAbierto(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 text-[13px] font-semibold text-white/90"
          >
            <Plus size={14} /> Agregar registro a este diente
          </button>
        )}
      </div>
    </div>
  );
}
