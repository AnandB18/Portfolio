import { COMMANDS, getCommandSuggestion } from './commands';
import {
  TERMINAL_EDUCATION_ITEMS,
  TERMINAL_EXPERIENCE_ITEMS,
  TERMINAL_PROJECT_ITEMS,
  TERMINAL_WHOAMI,
} from './data';
import type { CommandContext, CommandExecutionResult, TerminalLine } from './types';

const asOutputLines = (lines: string[]): TerminalLine[] =>
  lines.map((text) => ({ text, kind: 'output' }));

const asHelpLines = (lines: string[]): TerminalLine[] =>
  lines.map((text) => {
    const firstSpace = text.indexOf(' ');
    if (firstSpace <= 0) {
      return {
        text,
        kind: 'output' as const,
        segments: [{ text, tone: 'hint' as const }],
      };
    }

    return {
      text,
      kind: 'output' as const,
      segments: [
        { text: text.slice(0, firstSpace), tone: 'hint' as const },
        { text: text.slice(firstSpace) },
      ],
    };
  });

const asProjectLines = (): TerminalLine[] =>
  TERMINAL_PROJECT_ITEMS.flatMap((item) => [
    {
      text: `${item.name}: ${item.githubUrl}`,
      kind: 'output' as const,
      segments: [
        { text: item.name, tone: 'project' as const },
        { text: ': ' },
        { text: item.githubUrl, tone: 'project-link' as const },
      ],
    },
    {
      text: `\t${item.summary}`,
      kind: 'output' as const,
    },
  ]);

const asExperienceLines = (): TerminalLine[] =>
  TERMINAL_EXPERIENCE_ITEMS.flatMap((item) => [
    {
      text: item.titleAndTimeframe,
      kind: 'output' as const,
      segments: [{ text: item.titleAndTimeframe, tone: 'project' as const }],
    },
    {
      text: `\t${item.description}`,
      kind: 'output' as const,
    },
  ]);

const asEducationLines = (): TerminalLine[] =>
  TERMINAL_EDUCATION_ITEMS.flatMap((item) => [
    {
      text: item.titleAndTimeframe,
      kind: 'output' as const,
      segments: [{ text: item.titleAndTimeframe, tone: 'project' as const }],
    },
    {
      text: `\t${item.description}`,
      kind: 'output' as const,
    },
  ]);

const segmentLineWithHintCommands = (line: string) =>
  line.split(/(\s+)/).map((token) => {
    const normalized = token.toLowerCase().replace(/[^a-z-]/g, '');
    const tone = Object.hasOwn(COMMANDS, normalized) ? ('hint' as const) : undefined;
    return { text: token, tone };
  });

const asWhoamiLines = (): TerminalLine[] => {
  const { displayName, credentials, tagline, suggestedCommands } = TERMINAL_WHOAMI;
  const headlineText = `${displayName} · ${credentials}`;
  const tryText = `Try: ${suggestedCommands.join(', ')}`;

  return [
    {
      text: headlineText,
      kind: 'output' as const,
      segments: [
        { text: displayName, tone: 'project' as const },
        { text: ` · ${credentials}` },
      ],
    },
    { text: tagline, kind: 'output' as const },
    { text: tryText, kind: 'output' as const, segments: segmentLineWithHintCommands(tryText) },
  ];
};

export const executeCommand = (
  raw: string,
  ctx: CommandContext
): CommandExecutionResult => {
  // Normalize user input once so command lookup is consistent.
  const trimmed = raw.trim();
  const command = trimmed.toLowerCase();

  // For now we intentionally support only one command at a time.
  const unsupportedTokens = ['&&', '||', '|', ';', '>>', '>', '<', '&'];
  const hitToken = unsupportedTokens.find((token) => trimmed.includes(token));

  if (hitToken) {
    return {
      lines: [
        { text: trimmed, kind: 'command' },
        { text: `Unsupported token detected: ${hitToken}`, kind: 'error' },
        { text: 'Shell operators are not supported yet.', kind: 'hint' },
        { text: 'Please run one command at a time.', kind: 'hint' },
      ],
      didClear: false,
    };
  }

  if (!command) {
    return { lines: [], didClear: false };
  }

  const def = COMMANDS[command];

  if (!def) {
    const suggestion = getCommandSuggestion(command);
    const suggestionLine = suggestion ? `Did you mean: ${suggestion}?` : null;
    return {
      lines: [
        { text: trimmed, kind: 'command' },
        { text: `Command not found: ${command}`, kind: 'error' },
        ...(suggestionLine ? [{ text: suggestionLine, kind: 'hint' as const }] : []),
      ],
      didClear: false,
    };
  }

  const output = def.run(ctx);

  // Clear mutates state via context callback, so no output lines are returned.
  if (command === 'clear') {
    return { lines: [], didClear: true };
  }

  if (command === 'help') {
    return {
      lines: [
        { text: trimmed, kind: 'command' },
        ...asHelpLines(output),
      ],
      didClear: false,
    };
  }

  if (command === 'whoami') {
    return {
      lines: [{ text: trimmed, kind: 'command' }, ...asWhoamiLines()],
      didClear: false,
    };
  }

  if (command === 'projects') {
    return {
      lines: [{ text: trimmed, kind: 'command' }, ...asProjectLines()],
      didClear: false,
    };
  }

  if (command === 'experience') {
    return {
      lines: [{ text: trimmed, kind: 'command' }, ...asExperienceLines()],
      didClear: false,
    };
  }

  if (command === 'education') {
    return {
      lines: [{ text: trimmed, kind: 'command' }, ...asEducationLines()],
      didClear: false,
    };
  }

  return {
    lines: [{ text: trimmed, kind: 'command' }, ...asOutputLines(output)],
    didClear: false,
  };
};
