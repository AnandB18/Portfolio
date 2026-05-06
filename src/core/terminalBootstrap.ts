import { ASCII_HEADER } from './data';
import type { TerminalLine } from './types';

const welcomeLine: TerminalLine = {
  text: 'Welcome. Type \'help\' to see commands.',
  kind: 'system',
  segments: [
    { text: "Welcome. Type '" },
    { text: 'help', tone: 'hint' },
    { text: "' to see commands." },
  ],
};

/** Banner + welcome row; used on first load and after `clear`. */
export function buildInitialTerminalHistory(): TerminalLine[] {
  const asciiLines = ASCII_HEADER.filter((line) => line.trim().length > 0).map((text) => ({
    text,
    kind: 'ascii' as const,
  }));

  return [...asciiLines, { text: '', kind: 'system' }, welcomeLine];
}
