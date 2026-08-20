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
  11: "50.326,24.474 50.244,33.04 50.041,33.369 49.907,33.48 49.706,33.593 49.438,33.709 48.499,33.949 47.42,34.189 42.874,34.185 42.603,34.072 42.4,33.961 42.062,33.738 41.588,33.296 41.383,32.968 40.836,31.873 40.834,31.765 41.026,26.389 41.146,24.136 41.349,22.776 41.846,20.408 42.061,19.627 42.418,18.521 42.913,17.209 43.191,16.665 43.744,15.799 43.95,15.583 44.498,15.151 44.975,15.042 45.589,15.042 45.93,15.151 46.545,15.477 46.82,15.801 47.509,16.672 48.061,17.443 48.13,17.553 48.41,18.213 48.971,19.764 49.25,20.658",
  12: "34.635,25.216 34.858,22.372 35.081,21.137 35.226,20.579 35.512,19.692 35.868,18.704 36.08,18.159 36.361,17.509 37.124,15.791 37.465,15.681 37.533,15.68 38.078,15.783 38.419,15.995 38.967,16.528 39.59,17.494 39.94,18.25 40.508,19.56 41.151,21.233 41.294,21.684 41.579,22.706 41.65,23.048 41.721,23.504 41.731,24.644 41.462,30.274 41.374,31.473 41.298,32.016 41.228,32.234 41.09,32.454 40.953,32.566 40.202,33.018 39.996,33.131 39.311,33.358 37.118,33.357 36.639,33.24 36.229,33.123 35.956,33.008 35.546,32.674 35.132,32.013 34.991,31.575 34.842,30.701 34.682,29.159",
  13: "35.344,25.213 35.583,30.385 35.578,30.717 35.51,30.83 34.761,31.961 32.827,34.088 32.62,34.306 32.343,34.524 31.999,34.635 31.655,34.637 30.203,33.669 30.133,33.561 29.991,33.237 29.704,32.477 29.265,31.156 29.112,30.487 28.941,29.13 28.957,23.899 29.048,23.003 29.374,20.384 29.449,19.953 29.521,19.63 29.735,18.771 29.945,18.128 30.084,17.807 30.29,17.485 31.993,17.48 32.198,17.588 33.715,19.645",
  14: "23.584,28.748 23.814,24.111 23.98,22.882 24.14,21.785 24.292,20.917 24.439,20.268 24.581,19.837 24.926,19.508 25.064,19.398 26.302,19.385 27.416,20.778 27.771,21.431 27.986,21.869 28.346,22.647 29.066,24.467 29.346,25.276 29.487,26.082 29.86,29.729 29.831,31.396 29.625,31.736 27.749,34.406 27.541,34.624 27.335,34.734 26.233,34.956 26.096,34.955 25.889,34.742 24.773,33.337 24.492,32.897 23.918,31.568 23.77,31.011 23.619,30.336",
  15: "19.298,31.65 19.288,27.709 19.702,24.235 19.778,23.798 19.926,23.145 20.071,22.603 20.213,22.171 20.353,21.847 20.422,21.738 20.698,21.519 21.315,21.508 21.726,21.822 22.769,23.205 22.91,23.421 23.986,25.297 24.061,25.521 26.116,34.582 26.113,34.8 25.902,35.571 25.763,35.902 25.489,36.345 25.284,36.569 25.012,36.794 24.808,36.909 21.375,35.903 20.817,35.57 20.397,35.127 20.255,34.906 20.111,34.576 19.747,33.576 19.598,33.015",
  16: "19.861,26.648 23.859,36.332 22.914,37.995 22.711,38.326 22.576,38.439 21.708,38.47 18.089,36.756 17.948,36.649 17.09,35.667 16.73,35.215 16.658,35.102 16.2,33.627 16.115,33.049 16.031,32.344 15.952,31.51 15.951,30.913 16.087,27.78 16.426,24.827 16.573,24.074 16.716,23.537 16.787,23.322 16.924,23.213 17.336,23.205 17.541,23.414 19.789,26.536",
  17: "15.105,24.694 21.14,37.126 21.139,37.237 20.732,38.137 20.459,38.699 20.116,39.263 19.845,39.494 19.574,39.615 19.031,39.75 18.071,39.795 17.864,39.696 14.443,36.911 14.372,36.793 14.226,36.327 13.804,34.685 13.672,33.986 13.548,33.063 13.514,31.135 13.564,28.601 13.655,27.192 14.287,25.244 14.494,24.813 14.63,24.703",
  18: "11.736,32.685 12.093,29.31 12.252,28.116 12.402,27.255 12.687,26.075 12.827,25.647 13.173,24.687 13.242,24.58 13.718,24.576 13.854,24.681 13.922,24.787 13.99,24.999 17.207,37.633 17.262,38.184 17.253,38.625 17.175,39.176 17.104,39.398 16.756,39.958 16.479,40.294 16.271,40.518 16.064,40.633 15.72,40.753 15.582,40.757 14.755,40.353 13.135,39.172 12.85,38.945 12.636,38.718 12.348,38.266 12.202,37.927 11.903,37.016 11.824,36.558 11.74,35.864",
  21: "49.767,29.426 49.74,25.654 49.871,24.536 50.071,23.528 50.207,22.968 51.455,19.067 51.665,18.518 52.222,17.209 53.527,15.157 54.071,14.939 55.631,14.939 55.903,15.048 56.107,15.156 56.515,15.481 57.129,16.026 57.472,16.568 57.888,17.545 58.585,19.3 58.795,19.963 58.873,20.733 58.956,21.84 59.046,24.078 59.042,31.86 59.037,32.185 58.968,32.404 58.49,33.176 58.218,33.507 58.082,33.619 57.879,33.732 57.608,33.848 56.931,33.973 52.365,33.963 51.689,33.837 51.084,33.71 50.682,33.59 50.147,33.357 50.079,33.247 49.936,32.378",
  22: "58.527,30.995 58.402,24.401 58.538,23.721 58.606,23.494 60.152,19.234 60.365,18.688 60.505,18.362 61.407,16.957 61.682,16.635 61.887,16.421 63.185,16.422 63.458,16.531 63.802,17.068 63.941,17.39 64.295,18.465 64.656,19.767 64.883,20.863 65.114,22.089 65.191,22.541 65.294,24.486 65.341,27.611 65.293,29.845 65.21,30.615 64.916,31.927 64.637,32.367 64.499,32.479 64.017,32.814 63.81,32.926 63.535,33.038 63.122,33.151 62.158,33.154 60.647,33.02 60.169,32.898 59.897,32.781 59.216,32.325 58.735,31.548",
  23: "64.68,30.18 64.799,24.094 66.194,20.942 67.658,18.651 68.346,17.902 68.688,17.69 69.848,17.7 69.986,17.915 70.407,19.201 70.551,19.847 70.85,21.365 71.083,22.686 71.166,23.356 71.27,24.946 71.288,27.163 71.13,28.794 70.964,30.045 70.663,31.165 70.226,32.375 69.872,32.922 69.173,33.787 68.689,34.32 68.482,34.426 67.519,34.415 66.967,33.976 65.581,32.199 65.03,31.299 64.755,30.736 64.684,30.401",
  24: "69.446,32.759 70.623,24.855 70.767,24.403 72.882,20.871 73.777,19.491 73.913,19.386 74.459,19.391 74.938,19.611 75.35,20.046 75.558,20.372 75.779,21.664 75.856,22.205 76.104,24.396 76.17,28.754 76.081,30.266 75.843,31.746 75.767,32.083 75.548,32.645 74.617,34.515 74.406,34.84 74.197,35.056 74.058,35.164 71.441,35.553 70.83,35.532 70.694,35.419 70.142,34.534 69.588,33.313 69.448,32.868",
  25: "73.872,34.661 75.809,25.734 78.265,21.927 78.471,21.716 78.744,21.507 79.563,21.519 79.769,21.736 79.909,22.059 80.051,22.597 80.195,23.243 80.745,26.976 80.793,29.612 80.653,31.37 80.18,34.222 79.959,34.888 79.743,35.331 79.672,35.442 79.531,35.556 79.321,35.671 75.311,36.791 74.772,36.769 74.636,36.655 74.294,36.208 74.089,35.873 73.88,35.21",
  26: "76.331,35.785 76.394,35.567 80.24,27.043 81.864,24.366 82.478,23.42 82.614,23.316 82.955,23.323 83.228,23.436 83.442,24.296 83.515,24.62 83.81,26.031 83.971,27.237 84.156,29.481 84.178,31.098 84.045,32.386 83.896,33.436 83.739,34.357 83.589,34.927 83.443,35.269 82.792,36.505 82.721,36.616 82.579,36.729 78.496,38.269 78.094,38.361 77.425,38.335 76.812,37.334 76.539,36.669 76.335,36.114",
  27: "79.07,37.705 79.197,37.378 84.51,25.968 85.048,25.235 85.183,25.132 85.318,25.135 85.456,25.352 85.598,25.997 85.889,27.402 86.038,28.273 86.193,29.371 86.364,31.264 86.391,33.312 86.261,34.695 85.84,36.431 85.491,37.018 82.575,39.505 82.296,39.711 81.675,40.011 81.264,40.102 80.718,40.078 80.445,39.958 80.24,39.841 79.898,39.499 79.554,38.937 79.141,38.039 79.071,37.816",
  28: "82.604,37.963 82.664,37.635 86.062,26.376 86.542,24.894 86.61,24.788 86.883,24.579 87.02,24.686 87.088,24.793 87.365,25.328 87.435,25.542 87.578,26.289 87.651,26.717 88.221,30.872 88.309,31.56 88.403,32.733 88.405,32.851 88.327,35.117 88.166,36.053 88.011,36.629 87.705,37.644 87.482,38.198 87.19,38.854 85.852,39.933 85.643,40.037 85.366,40.138 84.883,40.233 84.194,40.102 83.852,39.981 83.578,39.862 83.169,39.627 82.829,39.395 82.623,39.059",
  31: "56.344,67.139 56.417,71.202 55.977,75.446 55.902,75.908 55.679,76.941 54.866,79.72 54.722,80.154 54.439,80.803 54.159,81.235 53.952,81.345 53.676,81.455 53.4,81.457 52.572,81.348 52.295,81.132 52.086,80.916 51.386,79.934 51.315,79.823 50.959,79.052 50.808,78.391 49.87,73.592 49.644,70.654 49.701,67.365 49.84,67.035 50.322,66.264 50.526,66.15 50.798,66.034 51.753,65.796 53.879,65.785 55.517,65.929 55.721,66.042 55.858,66.154 56.203,66.703",
  32: "55.755,70.786 55.94,67.804 56.083,67.256 56.364,66.49 56.708,65.941 56.845,65.829 57.118,65.713 61.43,65.708 62.041,65.834 62.178,65.946 62.247,66.056 62.386,66.383 62.46,66.817 62.548,71.668 61.931,76.62 61.774,77.519 61.549,78.408 61.403,78.849 60.832,80.161 60.762,80.269 60.553,80.488 60.414,80.598 59.79,81.032 59.583,81.139 58.549,81.133 58.341,81.024 58.065,80.805 57.573,79.936 57.431,79.608 55.861,74.19 55.729,73.618",
  33: "61.72,72.706 61.758,68.417 61.92,66.761 61.988,66.649 62.331,66.199 62.879,65.743 65.016,64.405 65.223,64.298 65.636,64.192 66.117,64.196 66.598,64.309 66.805,64.526 67.36,65.182 67.708,65.731 67.997,66.716 68.074,67.155 68.23,68.15 68.395,69.609 68.424,72.136 68.175,75.573 68.015,76.684 67.862,77.563 67.714,78.218 67.496,79.085 67.286,79.52 66.731,80.385 66.456,80.602 66.251,80.711 65.703,80.716 65.017,80.185 63.972,78.571 63.689,78.026 63.475,77.586 62.832,76.135 62.548,75.453 61.857,73.618 61.79,73.389",
  34: "69.26,61.456 70.213,61.441 71.169,62.073 71.443,62.287 72.339,63.044 72.479,63.26 72.692,63.907 72.983,64.991 73.295,66.75 73.464,68.102 73.477,72.53 73.359,74.557 72.975,76.64 72.903,76.858 72.623,77.296 72.416,77.409 72.07,77.525 71.863,77.529 71.379,77.43 71.033,77.326 70.615,77.113 70.475,77.005 70.265,76.79 70.124,76.574 69.553,75.593 67.785,72.153 67.716,71.922 67.232,66.497 67.25,65.399 67.322,65.068 68.502,62.648",
  35: "70.728,62.105 70.729,61.995 71.692,59.441 71.761,59.33 71.965,59.105 72.1,58.992 73.18,58.949 76.919,59.984 76.99,60.094 77.278,60.752 77.57,61.529 77.721,62.088 77.875,62.766 77.957,63.336 78.04,64.027 78.214,68.55 78.139,72.171 77.991,73.036 77.638,74.117 77.501,74.333 77.228,74.446 75.863,74.466 75.59,74.255 74.97,73.404 72.859,69.887",
  36: "73.251,59.631 73.197,58.415 73.471,57.417 73.675,56.862 74.083,56.083 74.287,55.749 74.422,55.635 75.967,55.571 80.124,56.182 80.471,56.412 80.753,56.859 81.258,58.313 81.402,58.767 81.826,60.367 82.096,61.968 82.156,63.219 82.116,66.019 81.957,67.56 81.803,68.759 81.733,68.978 81.524,69.524 81.248,69.962 80.3,69.991 79.826,69.577 79.486,69.265 78.099,67.579 73.38,59.961 73.315,59.851",
  37: "76.937,52.293 82.172,51.693 83.282,51.712 83.705,52.369 84.207,53.473 84.35,53.808 84.781,54.939 85.066,55.854 85.207,56.428 85.279,56.886 85.545,58.835 85.595,60.422 85.583,61.208 85.419,62.985 85.344,63.426 85.271,63.756 85.059,64.416 84.782,64.86 84.369,65.306 84.027,65.424 83.343,65.445 83.138,65.343 83.001,65.24 81.752,63.979 75.722,55.943 75.528,55.616 75.531,55.176 75.799,54.293 76.067,53.629 76.268,53.186 76.603,52.63 76.803,52.406",
  38: "77.477,52.608 77.477,52.387 77.605,51.507 77.734,50.955 77.799,50.734 79.994,46.154 80.265,45.814 80.806,45.353 81.01,45.235 84.393,44.914 85.784,44.951 86.061,45.07 86.2,45.184 86.411,45.518 86.694,46.076 87.544,48.452 88.085,50.278 88.151,50.845 88.214,51.637 88.191,53.994 88.118,54.44 87.195,57.864 86.983,58.517 86.847,58.629 86.441,58.642 86.238,58.541 85.012,57.828",
  41: "44.765,66.019 48.244,66.007 49.332,66.246 50.008,66.481 50.083,71.044 50.059,73.632 49.867,75.59 49.797,76.053 49.433,77.779 49.063,79.131 48.626,80.348 48.555,80.458 48.274,80.791 47.995,81.014 47.506,81.345 47.159,81.456 47.089,81.457 46.462,81.138 46.042,80.813 45.615,80.161 45.178,79.172 44.649,77.477 44.499,76.897 44.35,76.193 44.208,75.368 43.963,73.043 43.689,70.154 43.739,67.119 43.879,66.686 44.154,66.249 44.29,66.138",
  42: "44.245,66.941 44.45,71.354 44.463,72.599 44.271,73.624 44.072,74.429 42.711,78.856 42.207,80.375 42.066,80.699 41.996,80.807 41.788,81.024 41.375,81.136 40.892,81.14 40.547,81.033 39.994,80.816 39.577,80.382 39.085,79.619 38.872,79.181 38.656,78.631 38.429,77.636 38.272,76.74 37.826,73.625 37.763,72.814 37.658,70.991 37.73,67.248 37.806,66.705 37.95,66.055 38.226,65.617 38.635,65.391 39.111,65.378 40.548,65.569 43.153,66.039 43.697,66.273 43.834,66.386 44.107,66.72",
  43: "32.231,65.727 32.717,64.963 32.854,64.852 33.61,64.305 33.815,64.196 34.5,64.192 34.706,64.298 36.905,65.617 37.317,65.955 37.728,66.404 37.935,66.737 38.262,70.28 38.345,72.092 38.345,73.23 38.279,73.572 37.664,75.409 36.095,79.099 35.813,79.641 35.744,79.749 35.396,80.18 35.05,80.502 34.431,80.61 33.812,80.605 33.606,80.495 33.329,80.277 33.26,80.169 32.77,79.301 32.628,78.974 32.34,78.1 32.088,76.002 31.911,73.944 31.841,71.842 31.825,69.229 31.845,68.345 32.006,67.029",
  44: "26.917,75.81 26.755,74.301 26.5,69.437 26.503,68.238 26.592,67.173 26.759,66.133 26.924,65.233 27.082,64.461 27.157,64.241 27.376,63.693 27.591,63.258 28.085,62.502 28.365,62.18 28.712,61.861 29.194,61.44 29.606,61.233 30.359,61.249 30.565,61.362 30.978,61.696 31.323,62.137 32.778,65.145 32.784,65.588 32.192,72.242 32.12,72.578 29.814,76.467 29.467,77.004 29.054,77.431 28.78,77.538 28.095,77.536 27.821,77.426 27.41,77.207 27.271,76.992 27.132,76.669 27.061,76.454",
  45: "29.323,62.061 26.99,69.468 26.636,70.281 26.204,71.197 24.987,73.081 24.565,73.618 24.286,73.937 24.147,74.043 23.939,74.148 23.11,74.134 22.833,74.02 22.694,73.909 22.554,73.691 22.338,73.04 22.191,72.494 22.036,71.617 21.954,71.064 21.869,70.393 21.691,68.444 21.615,66.918 21.645,64.946 21.845,62.162 21.994,61.505 22.21,60.85 22.351,60.523 22.421,60.414 22.906,59.973 27.213,58.846 27.55,58.857 27.819,58.973 28.023,59.194 28.5,59.966 29.116,61.399",
  46: "17.992,68.323 17.846,63.554 18.39,59.544 18.694,57.857 18.841,57.302 19.125,56.744 19.195,56.632 19.404,56.407 19.751,56.177 25.043,55.401 25.244,55.409 25.379,55.523 25.582,55.747 26.057,56.527 26.465,57.525 26.871,58.746 26.879,59.74 22.061,67.253 21.424,68.005 20.866,68.637 20.659,68.846 19.908,69.574 19.772,69.677 19.501,69.776 18.686,69.75 18.481,69.528 18.134,68.869",
  47: "14.448,62.133 14.391,58.426 14.453,57.737 14.869,55.431 14.942,55.087 15.013,54.858 15.587,53.488 16.016,52.702 16.515,51.928 16.655,51.817 16.865,51.704 17.775,51.692 22.678,52.305 23.009,52.425 23.407,52.765 23.74,53.211 24.272,54.32 24.472,54.982 24.476,55.971 17.775,64.403 17.567,64.615 16.469,65.448 15.582,65.425 15.513,65.316 15.235,64.771 14.954,64.114 14.743,63.565 14.599,63.015",
  48: "12.004,54.098 11.982,49.935 12.254,48.801 12.811,46.992 13.092,46.317 13.161,46.204 13.368,45.974 13.99,45.4 14.268,45.172 18.98,45.221 19.596,45.903 19.937,46.357 20.005,46.47 21.679,50.174 22.07,51.062 22.199,51.836 22.195,52.941 22.13,53.053 14.087,58.329 13.817,58.427 13.479,58.523 13.074,58.509 12.937,58.289 12.796,57.853",
};

// Centro X de cada diente (promedio de sus puntos), para alinear la
// línea + círculo con número que sale arriba/abajo de la foto.
const CENTRO_X_DIENTE: Record<number, number> = {
  11: 45.22, 12: 38.25, 13: 31.38, 14: 26.3, 15: 22.04, 16: 18.18, 17: 16.58, 18: 14.13,
  21: 54.84, 22: 62.47, 23: 68.64, 24: 73.51, 25: 78.09, 26: 81.42, 27: 83.14, 28: 86.18,
  31: 53.14, 32: 59.36, 33: 65.43, 34: 70.98, 35: 75.54, 36: 78.47, 37: 82.05, 38: 84.18,
  41: 46.79, 42: 40.77, 43: 34.6, 44: 28.68, 45: 24.23, 46: 21.34, 47: 17.71, 48: 16.08,
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
  return { fill: `rgba(${est.glow},0.38)`, stroke: est.ring, strokeWidth: 0.25 };
}

// Etiquetas con línea + círculo (como una carta dental) arriba y abajo
// de la foto, para identificar el número de cada diente de un vistazo.
const ALTURA_ETIQUETAS = 50;
const LINEA_CERCA = 13;
const LINEA_LEJOS = 29;

function EtiquetaDiente({
  numero,
  xPercent,
  nivel,
  arriba,
  estado,
  activo,
  onClick,
}: {
  numero: number;
  xPercent: number;
  nivel: 0 | 1;
  arriba: boolean;
  estado: EstadoDiente;
  activo: boolean;
  onClick: () => void;
}) {
  const est = ESTADO_DIENTE[estado];
  const largoLinea = nivel === 0 ? LINEA_CERCA : LINEA_LEJOS;
  const colorLinea = activo || estado !== "sano" ? est.ring : "rgba(255,255,255,0.3)";
  const circuloEstilo: CSSProperties = activo
    ? { backgroundColor: est.ring, borderColor: est.ring, color: "#15101f" }
    : estado === "sano"
      ? { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.75)" }
      : { backgroundColor: `rgba(${est.glow},0.22)`, borderColor: est.ring, color: est.ring };

  return (
    <>
      <span
        className="pointer-events-none absolute"
        style={{
          left: `${xPercent}%`,
          transform: "translateX(-50%)",
          width: 1,
          height: largoLinea,
          backgroundColor: colorLinea,
          top: arriba ? ALTURA_ETIQUETAS - largoLinea : 0,
        }}
      />
      <button
        onClick={onClick}
        aria-label={`Diente ${numero}`}
        className="absolute flex items-center justify-center rounded-full border text-[8px] font-semibold leading-none transition-colors"
        style={{
          left: `${xPercent}%`,
          transform: "translateX(-50%)",
          width: 17,
          height: 17,
          top: arriba ? ALTURA_ETIQUETAS - largoLinea - 17 : largoLinea,
          ...circuloEstilo,
        }}
      >
        {numero}
      </button>
    </>
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
            <div className="relative" style={{ height: ALTURA_ETIQUETAS }}>
              {ARCO_SUPERIOR.map((n, i) => (
                <EtiquetaDiente
                  key={n}
                  numero={n}
                  xPercent={CENTRO_X_DIENTE[n]}
                  nivel={(i % 2) as 0 | 1}
                  arriba
                  estado={historial[n]?.estado ?? "sano"}
                  activo={n === seleccionado}
                  onClick={() => seleccionar(n)}
                />
              ))}
            </div>

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

            <div className="relative" style={{ height: ALTURA_ETIQUETAS }}>
              {ARCO_INFERIOR_VISUAL.map((n, i) => (
                <EtiquetaDiente
                  key={n}
                  numero={n}
                  xPercent={CENTRO_X_DIENTE[n]}
                  nivel={(i % 2) as 0 | 1}
                  arriba={false}
                  estado={historial[n]?.estado ?? "sano"}
                  activo={n === seleccionado}
                  onClick={() => seleccionar(n)}
                />
              ))}
            </div>
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
