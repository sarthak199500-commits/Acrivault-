import { useState } from 'react';
import type { ReactNode } from 'react';
import { MfaEnroll } from 'acrivault';

/* MfaEnroll shows the setup material (a placeholder QR + the manual secret with a
 * copy control) and a confirm CodeInput. enrollment is { secret, qrSvg }; the QR is
 * decorative (not a real otpauth URI — MFA crypto is upstream). */

// A decorative QR-like grid so the setup panel reads correctly without shipping a
// real, scannable code. Deterministic pattern, black modules on the white panel.
const QR_SVG = (() => {
  const N = 21, cell = 8, cells: string[] = [];
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (edge || core) cells.push(`<rect x="${(ox + x) * cell}" y="${(oy + y) * cell}" width="${cell}" height="${cell}"/>`);
    }
  };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  let seed = 7;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const inFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    if (inFinder) continue;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    if (seed % 100 < 46) cells.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`);
  }
  return `<svg viewBox="0 0 ${N * cell} ${N * cell}" width="100%" height="100%" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${cells.join('')}</svg>`;
})();

const ENROLLMENT = { secret: 'JBSW Y3DP EHPK 3PXP', qrSvg: QR_SVG };

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 380 }}>{children}</div>
    </div>
  );
}

/** The full enrollment step: scan-or-key instructions, the QR + copyable setup key
 *  panel, and the confirmation code input. */
export function Setup() {
  const [code, setCode] = useState('');
  return (
    <Frame>
      <MfaEnroll enrollment={ENROLLMENT} code={code} onCodeChange={setCode} />
    </Frame>
  );
}
