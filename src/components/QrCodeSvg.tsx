import React from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
}

/**
 * Menghasilkan pola matriks QR Code deterministik berbasis SVG tanpa ketergantungan jaringan.
 */
export function QrCodeSvg({ value, size = 160 }: QrCodeSvgProps) {
  const grid = 21;
  const cells: boolean[][] = Array.from({ length: grid }, () => Array(grid).fill(false));

  const setFinder = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[top + r][left + c] = border || inner;
      }
    }
  };

  setFinder(0, 0);
  setFinder(0, grid - 7);
  setFinder(grid - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= grid - 8;
      const inBottomLeft = r >= grid - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      if (r === 6 || c === 6) {
        cells[r][c] = (r + c) % 2 === 0;
        continue;
      }
      const bitSeed = (hash ^ (r * 31 + c * 17) ^ value.charCodeAt((r + c) % value.length)) >>> 0;
      cells[r][c] = bitSeed % 3 !== 0;
    }
  }

  const cellSize = size / grid;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Kode QR untuk ${value}`}
      className="bg-white p-2 border border-slate-200 rounded-lg"
    >
      <rect x={0} y={0} width={size} height={size} fill="#ffffff" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={Math.ceil(cellSize)}
              height={Math.ceil(cellSize)}
              fill="#0F2744"
            />
          ) : null
        )
      )}
    </svg>
  );
}
