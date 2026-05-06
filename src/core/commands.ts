import {
  TERMINAL_EDUCATION_ITEMS,
  TERMINAL_EXPERIENCE_ITEMS,
  TERMINAL_HELP_ITEMS,
  TERMINAL_PROJECT_ITEMS,
  TERMINAL_RESUME_LINES,
  terminalWhoamiAsStrings,
} from './data';
import type { CommandDefinition } from './types';

// Central command registry used by help output, execution, and autocomplete.
export const COMMANDS: Record<string, CommandDefinition> = {
  help: {
    description: 'Show available commands',
    run: () => {
      const commandColumnWidth = 20;
      return TERMINAL_HELP_ITEMS.map((item) => `${item.command.padEnd(commandColumnWidth)}${item.description}`);
    },
  },
  clear: {
    description: 'Clear terminal output',
    run: ({ clearHistory }) => {
      clearHistory();
      return [];
    },
  },
  whoami: {
    description: 'Learn about me',
    run: () => terminalWhoamiAsStrings(),
  },
  projects: {
    description: 'List available projects',
    run: () => TERMINAL_PROJECT_ITEMS.map((item) => `${item.name}: ${item.githubUrl} - ${item.summary}`),
  },
  experience: {
    description: 'Show work experience',
    run: () =>
      TERMINAL_EXPERIENCE_ITEMS.flatMap((item) => [item.titleAndTimeframe, `\t${item.description}`]),
  },
  education: {
    description: 'Show education background',
    run: () =>
      TERMINAL_EDUCATION_ITEMS.flatMap((item) => [item.titleAndTimeframe, `\t${item.description}`]),
  },
  resume: {
    description: 'Open my resume',
    run: () => TERMINAL_RESUME_LINES,
  },
};

// Levenshtein distance for typo-aware command suggestions.
const getEditDistance = (a: string, b: string): number => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[a.length][b.length];
};

export const getCommandSuggestion = (input: string): string | null => {
  const commandNames = Object.keys(COMMANDS);
  // Prefer prefix matches so short partial input resolves naturally.
  const prefixMatch = commandNames.find((name) => name.startsWith(input));

  if (prefixMatch) return prefixMatch;

  let bestMatch: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const name of commandNames) {
    const score = getEditDistance(input, name);
    if (score < bestScore) {
      bestScore = score;
      bestMatch = name;
    }
  }

  return bestScore <= 2 ? bestMatch : null;
};
