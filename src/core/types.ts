export type CommandContext = {
  clearHistory: () => void;
};

export type CommandHandler = (ctx: CommandContext) => string[];

export type CommandDefinition = {
  description: string;
  run: CommandHandler;
};

export type Project = {
  id: string;
  title: string;
  status?: 'current' | 'completed';
  /** Short bullet-sized lines for the preview card (easier to scan than one long paragraph). */
  summaryLines?: string[];
  stack?: string[];
  imageKey?: string;
  imageAlt?: string;
  repoUrl?: string;
  liveUrl?: string;
};

export type Experience = {
  id: string;
  role: string;
  org: string;
  period: string;
  highlights: string[];
};

export type Education = {
  id: string;
  school: string;
  program: string;
  period: string;
  location?: string;
  /** Single-line GPA when you do not split technical vs cumulative */
  gpa?: string;
  gpaTechnical?: string;
  gpaCumulative?: string;
  honors?: string[];
  coursework?: string[];
  highlights?: string[];
};

export type SkillGroup = {
  label: string;
  items: string[];
};

export type ContactLink = {
  label: string;
  value: string;
};

export type CommandExecutionResult = {
  lines: TerminalLine[];
  didClear: boolean;
};

export type TerminalLineKind =
  | 'ascii'
  | 'system'
  | 'command'
  | 'output'
  | 'hint'
  | 'error';

export type TerminalSegmentTone = 'default' | 'hint' | 'command' | 'project' | 'project-link';

export type TerminalSegment = {
  text: string;
  tone?: TerminalSegmentTone;
};

export type TerminalLine = {
  text: string;
  kind: TerminalLineKind;
  segments?: TerminalSegment[];
};

export type CurrentlyItem = {
  label: string;
  title: string;
  subtitle?: string;
  description: string;
  imageKey?: string;
  imageAlt?: string;
  href?: string;
};

export type TerminalProjectItem = {
  name: string;
  githubUrl: string;
  summary: string;
};

export type TerminalExperienceItem = {
  titleAndTimeframe: string;
  description: string;
};

export type TerminalEducationItem = {
  titleAndTimeframe: string;
  description: string;
};

export type TerminalHelpItem = {
  command: string;
  description: string;
};

/** Single source for `whoami` terminal output; runner turns this into styled lines. */
export type TerminalWhoami = {
  displayName: string;
  /** Degree, school, and timing—shown after the name on line 1. */
  credentials: string;
  tagline: string;
  /** Shown as `Try: a, b, c` with command names highlighted. */
  suggestedCommands: readonly string[];
};
