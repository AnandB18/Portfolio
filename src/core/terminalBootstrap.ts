import { ASCII_HEADER } from './data';
import type { TerminalLine } from './types';

const welcomeLine: TerminalLine = {
  text: 'Welcome. Type \'help\' to see commands.',
  kind: 'system',
  segments: [
    { text: "Welcome. Type '" },
    { text: 'help', tone: 'command' },
    { text: "' to see commands." },
  ],
};

export function getAsciiHeaderLines(): TerminalLine[] {
  return ASCII_HEADER.filter((line) => line.trim().length > 0).map((text) => ({
    text,
    kind: 'ascii' as const,
  }));
}

export function getWelcomeLine(): TerminalLine {
  return welcomeLine;
}

/** Banner + welcome row; used on first load and after `clear`. */
export function buildInitialTerminalHistory(): TerminalLine[] {
  return [...getAsciiHeaderLines(), { text: '', kind: 'system' }, getWelcomeLine()];
}
