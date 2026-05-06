import { type KeyboardEventHandler, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowUpRightFromSquare,
  faBriefcase,
  faChevronDown,
  faChevronUp,
  faCircleCheck,
  faCodeBranch,
  faEnvelope,
  faFileLines,
  faFilePdf,
  faGraduationCap,
  faLock,
  faTerminal,
  faTrophy,
  faUser,
  faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { COMMANDS } from './core/commands';
import {
  ABOUT_PREVIEW,
  CONTACT,
  CTF_CHALLENGES,
  CURRENTLY_ITEMS,
  EDUCATION,
  EXPERIENCE,
  PROJECTS,
  PREVIEW_DEFAULT_COMMANDS,
  PREVIEW_DEFAULT_NAME,
  PREVIEW_DEFAULT_ROLE,
  PREVIEW_DEFAULT_TAGLINE,
  SOCIAL_LINKS,
} from './core/data';
import { RESUME_PDF_URL } from './core/resumeUrl';
import anandImage from './assets/Profile_Pic.jpg';
import avatarPhoto from './assets/Avatar_Photo.png';
import cliImage from './assets/CLI_Image.png';
import portfolioImage from './assets/Porfolio.png';
import redRisingPhoto from './assets/Red_Rising_Photo.jpg';
import { hrefOpensInNewTab } from './core/linkUtils';
import { executeCommand } from './core/runner';
import { buildInitialTerminalHistory } from './core/terminalBootstrap';
import type { TerminalLine, TerminalSegment } from './core/types';
import { useTerminalTyping } from './hooks/useTerminalTyping';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/window.css';
import './styles/terminal.css';
import './styles/preview.css';
import './styles/boot.css';

type PreviewState =
  | 'default'
  | 'whoami'
  | 'projects'
  | 'experience'
  | 'education'
  | 'resume'
  | 'ctf';
type PreviewEffect = 'idle' | 'pulse' | 'spike' | 'error';

type CtfChallengeId = 1 | 2 | 3;

type CtfProgress = {
  inMode: boolean;
  currentChallenge: CtfChallengeId;
  solved: Record<CtfChallengeId, boolean>;
  revealedHints: Record<CtfChallengeId, number>;
};

const CTF_STORAGE_KEY = 'portfolio-ctf-progress-v1';
const CTF_COMMANDS = ['ctf', 'status', 'challenge', 'hint', 'submit', 'restart', 'quit'] as const;
const DEFAULT_CTF_PROGRESS: CtfProgress = {
  inMode: false,
  currentChallenge: 1,
  solved: { 1: false, 2: false, 3: false },
  revealedHints: { 1: 0, 2: 0, 3: 0 },
};
const CTF_CHALLENGE_2_FLAG =
  CTF_CHALLENGES.find((challenge) => challenge.id === 2)?.expectedFlag ?? 'flag2{devtools_reveals_truth}';
const CTF_CHALLENGE_3_ENCODED = 'lehgh_wolbkn_wuijrank';

const preloadImage = (src: string) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
};

const scheduleIdleTask = (task: () => void) => {
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => task(), { timeout: 2500 });
    return;
  }

  window.setTimeout(task, 0);
};

const CURRENTLY_IMAGE_MAP: Record<string, string> = {
  'reading-image': redRisingPhoto,
  'watching-image': avatarPhoto,
  'learning-image': cliImage,
  'building-image': portfolioImage,
};

const parseCtfProgress = (value: string | null): CtfProgress => {
  if (!value) return DEFAULT_CTF_PROGRESS;

  try {
    const parsed = JSON.parse(value) as Partial<CtfProgress>;
    const currentChallenge = parsed.currentChallenge === 2 || parsed.currentChallenge === 3 ? parsed.currentChallenge : 1;
    return {
      inMode: Boolean(parsed.inMode),
      currentChallenge,
      solved: {
        1: Boolean(parsed.solved?.[1]),
        2: Boolean(parsed.solved?.[2]),
        3: Boolean(parsed.solved?.[3]),
      },
      revealedHints: {
        1: Math.max(0, Math.min(5, Number(parsed.revealedHints?.[1] ?? 0))),
        2: Math.max(0, Math.min(5, Number(parsed.revealedHints?.[2] ?? 0))),
        3: Math.max(0, Math.min(5, Number(parsed.revealedHints?.[3] ?? 0))),
      },
    };
  } catch {
    return DEFAULT_CTF_PROGRESS;
  }
};

const getCtfChallengeById = (id: CtfChallengeId) => CTF_CHALLENGES.find((item) => item.id === id)!;

function App() {
  const maxConcurrentTypingLines = 5;
  const overlapStartRatio = 0.2;
  const typingTickMs = 3;
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>(buildInitialTerminalHistory);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [courseworkManualById, setCourseworkManualById] = useState<Record<string, boolean>>({});
  const [previewState, setPreviewState] = useState<PreviewState>('default');
  const [previewEffect, setPreviewEffect] = useState<PreviewEffect>('idle');
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewOutputRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRafRef = useRef<number | null>(null);
  const previewEffectTimeoutRef = useRef<number | null>(null);
  const [shouldAutoFollow, setShouldAutoFollow] = useState(true);
  const [ctfProgress, setCtfProgress] = useState<CtfProgress>(() => {
    if (typeof window === 'undefined') return DEFAULT_CTF_PROGRESS;
    return parseCtfProgress(window.localStorage.getItem(CTF_STORAGE_KEY));
  });
  const [ctfExpanded, setCtfExpanded] = useState(false);
  const [ctfBottomMode, setCtfBottomMode] = useState<'absolute' | 'sticky'>('absolute');
  const previewTabLabel =
    previewState === 'default'
      ? 'Welcome'
      : previewState === 'ctf'
        ? 'CTF'
        : previewState.charAt(0).toUpperCase() + previewState.slice(1);
  const previewTabIcon =
    previewState === 'default'
      ? faWaveSquare
      : previewState === 'ctf'
        ? faTrophy
      : previewState === 'whoami'
        ? faUser
        : previewState === 'projects'
          ? faCodeBranch
          : previewState === 'experience'
            ? faBriefcase
            : previewState === 'education'
              ? faGraduationCap
              : faFileLines;
  const commitTypedLines = useCallback((lines: TerminalLine[]) => {
    if (lines.length === 0) return;
    setHistory((prev) => [...prev, ...lines]);
  }, []);
  const { activeTypingLines, enqueueLines, clearTyping } = useTerminalTyping({
    maxConcurrentTypingLines,
    overlapStartRatio,
    typingTickMs,
    onCommitLines: commitTypedLines,
  });
  const ctfActiveChallenge = getCtfChallengeById(ctfProgress.currentChallenge);
  const ctfSolvedCount = Number(ctfProgress.solved[1]) + Number(ctfProgress.solved[2]) + Number(ctfProgress.solved[3]);

  useEffect(() => {
    window.localStorage.setItem(CTF_STORAGE_KEY, JSON.stringify(ctfProgress));
  }, [ctfProgress]);

  const normalizePreviewScroll = useCallback(() => {
    const el = previewOutputRef.current;
    if (!el) return;

    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    if (maxScroll === 0) {
      el.scrollTop = 0;
      return;
    }

    el.scrollTop = Math.min(el.scrollTop, maxScroll);
  }, []);

  const scheduleNormalizePreviewScroll = useCallback(() => {
    if (previewScrollRafRef.current !== null) return;

    previewScrollRafRef.current = window.requestAnimationFrame(() => {
      previewScrollRafRef.current = null;
      normalizePreviewScroll();
    });
  }, [normalizePreviewScroll]);

  const syncCtfBottomMode = useCallback(() => {
    const el = previewOutputRef.current;
    if (!el || !ctfProgress.inMode) {
      setCtfBottomMode('absolute');
      return;
    }
    const needsScroll = el.scrollHeight > el.clientHeight + 1;
    setCtfBottomMode(needsScroll ? 'sticky' : 'absolute');
  }, [ctfProgress.inMode]);

  const handleCourseworkMouseEnter = useCallback((itemId: string) => {
    setCourseworkManualById((prev) => ({ ...prev, [itemId]: true }));
  }, []);

  const handleCourseworkMouseLeave = useCallback((itemId: string) => {
    setCourseworkManualById((prev) => {
      if (!Object.hasOwn(prev, itemId)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  useEffect(() => {
    scheduleIdleTask(() => {
      preloadImage(anandImage);
    });
  }, []);

  const renderPrompt = () => (
    <span className="terminal-transcript-prompt">
      <span className="terminal-prompt-user">Anand</span>
      <span className="terminal-prompt-host">@portfolio</span>
      <span className="terminal-prompt-path">:~</span>
      <span className="terminal-prompt-symbol">$</span>
    </span>
  );

  const renderTerminalLine = (line: TerminalLine, visibleChars?: number) => {
    const segments: TerminalSegment[] = line.segments?.length ? line.segments : [{ text: line.text }];
    let remainingChars = typeof visibleChars === 'number' ? visibleChars : Number.POSITIVE_INFINITY;
    const parts: ReactNode[] = [];

    for (const [idx, segment] of segments.entries()) {
      if (remainingChars <= 0) break;
      const visibleText = segment.text.slice(0, remainingChars);
      remainingChars -= visibleText.length;
      const segmentClassName =
        segment.tone && segment.tone !== 'default' ? `terminal-segment terminal-segment-${segment.tone}` : undefined;

      if (segment.tone === 'project-link' && visibleText.length === segment.text.length) {
        const href = segment.text.startsWith('http://') || segment.text.startsWith('https://')
          ? segment.text
          : `https://${segment.text}`;
        parts.push(
          <a
            key={`${segment.text}-${idx}`}
            className={`${segmentClassName ?? ''} terminal-segment-link`.trim()}
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {visibleText}
          </a>
        );
        continue;
      }

      parts.push(
        <span
          key={`${segment.text}-${idx}`}
          className={segmentClassName}
        >
          {visibleText}
        </span>
      );
    }

    return parts;
  };

  const pushTerminalOutput = useCallback((lines: TerminalLine[]) => {
    if (lines.length === 0) return;
    enqueueLines([{ text: '\u00a0', kind: 'output' }, ...lines, { text: '\u00a0', kind: 'output' }]);
  }, [enqueueLines]);

  const revealHint = useCallback((challengeId: CtfChallengeId, requestedLevel: number) => {
    const level = Math.max(1, Math.min(5, requestedLevel));
    if (challengeId !== ctfProgress.currentChallenge) {
      return [
        { text: `Challenge ${challengeId} is locked. Solve challenge ${ctfProgress.currentChallenge} first.`, kind: 'hint' as const },
      ];
    }

    const currentlyRevealed = ctfProgress.revealedHints[challengeId];
    const canReveal = level <= currentlyRevealed + 1 || level <= currentlyRevealed;
    if (!canReveal) {
      return [{ text: `Unlock hint ${currentlyRevealed + 1} before requesting hint ${level}.`, kind: 'hint' as const }];
    }

    setCtfProgress((prev) => ({
      ...prev,
      revealedHints: {
        ...prev.revealedHints,
        [challengeId]: Math.max(prev.revealedHints[challengeId], level),
      },
    }));

    return [
      { text: `Challenge ${challengeId} hint ${level}: ${getCtfChallengeById(challengeId).hints[level - 1]}`, kind: 'hint' as const },
    ];
  }, [ctfProgress.currentChallenge, ctfProgress.revealedHints]);

  const getCtfHelpLines = (): TerminalLine[] => {
    const columnWidth = 20;
    const coreRows = [
      { command: 'help', description: 'Show commands and CTF controls' },
      { command: 'clear', description: 'Clear terminal output' },
      { command: 'whoami', description: 'Open about preview' },
      { command: 'education', description: 'Open education preview' },
      { command: 'experience', description: 'Open experience preview' },
      { command: 'projects', description: 'Open projects preview' },
      { command: 'resume', description: 'Open resume preview' },
      { command: 'quit', description: 'Exit CTF mode (progress saved)' },
    ];
    const ctfRows = [
      { command: 'ctf', description: 'Open CTF panel' },
      { command: 'challenge <n>', description: 'View active challenge (ordered)' },
      { command: 'hint <n>', description: 'Reveal next hint (1-5)' },
      { command: 'submit <flag>', description: 'Submit flag for active challenge' },
      { command: 'status', description: 'Show CTF progress' },
      { command: 'restart', description: 'Reset all CTF progress' },
    ];
    return [
      { text: 'Core Commands', kind: 'system', segments: [{ text: 'Core Commands', tone: 'command' }] },
      ...coreRows.map((row) => ({
        text: `${row.command.padEnd(columnWidth)}${row.description}`,
        kind: 'output' as const,
        segments: [{ text: row.command.padEnd(columnWidth), tone: 'command' as const }, { text: row.description }],
      })),
      { text: 'CTF Commands (Active)', kind: 'system', segments: [{ text: 'CTF Commands (Active)', tone: 'project' }] },
      ...ctfRows.map((row) => ({
        text: `${row.command.padEnd(columnWidth)}${row.description}`,
        kind: 'output' as const,
        segments: [{ text: row.command.padEnd(columnWidth), tone: 'project' as const }, { text: row.description }],
      })),
    ];
  };

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const [head, ...rest] = trimmed.split(/\s+/);
    const command = head.toLowerCase();
    const args = rest;

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    const echoCommand = () => {
      setHistory((prev) => [...prev, { text: trimmed, kind: 'command' }]);
    };

    if (command === 'ctf') {
      echoCommand();
      setCtfProgress((prev) => ({ ...prev, inMode: true }));
      setPreviewState('ctf');
      setPreviewEffect('pulse');
      pushTerminalOutput([
        { text: 'CTF mode active. Solve challenges in order: 1 -> 2 -> 3.', kind: 'system' },
        { text: 'Use: status, challenge <n>, hint <n>, submit <flag>, restart, quit', kind: 'hint' },
      ]);
      return;
    }

    if (command === 'quit') {
      echoCommand();
      if (!ctfProgress.inMode) {
        pushTerminalOutput([{ text: 'Not in CTF mode. Run ctf to start.', kind: 'hint' }]);
        return;
      }
      setCtfProgress((prev) => ({ ...prev, inMode: false }));
      setCtfExpanded(false);
      setPreviewState(previewState === 'ctf' ? 'default' : previewState);
      setPreviewEffect('idle');
      pushTerminalOutput([{ text: 'Exited CTF mode. Progress saved.', kind: 'system' }]);
      return;
    }

    if (ctfProgress.inMode) {
      if (command === 'help') {
        echoCommand();
        pushTerminalOutput(getCtfHelpLines());
        return;
      }

      if (command === 'status') {
        echoCommand();
        const stateLabel = (id: CtfChallengeId) =>
          ctfProgress.solved[id] ? 'completed' : ctfProgress.currentChallenge === id ? 'active' : 'locked';
        pushTerminalOutput([
          { text: `CTF progress: ${ctfSolvedCount}/3 solved`, kind: 'system' },
          { text: `Challenge 1: ${stateLabel(1)}`, kind: 'output' },
          { text: `Challenge 2: ${stateLabel(2)}`, kind: 'output' },
          { text: `Challenge 3: ${stateLabel(3)}`, kind: 'output' },
        ]);
        return;
      }

      if (command === 'challenge') {
        echoCommand();
        const requested = Number(args[0] ?? ctfProgress.currentChallenge) as CtfChallengeId;
        const valid = requested === 1 || requested === 2 || requested === 3;
        if (!valid) {
          pushTerminalOutput([{ text: 'Usage: challenge <1|2|3>', kind: 'hint' }]);
          return;
        }
        if (requested > ctfProgress.currentChallenge) {
          pushTerminalOutput([{ text: `Challenge ${requested} is locked. Solve challenge ${ctfProgress.currentChallenge} first.`, kind: 'hint' }]);
          return;
        }
        setCtfProgress((prev) => ({ ...prev, currentChallenge: requested }));
        pushTerminalOutput([
          { text: `Loaded Challenge ${requested}: ${getCtfChallengeById(requested).title}`, kind: 'system' },
          ...(requested === 3
            ? [{ text: `Encoded payload: ${CTF_CHALLENGE_3_ENCODED}`, kind: 'hint' as const }]
            : []),
        ]);
        return;
      }

      if (command === 'hint') {
        echoCommand();
        const level = Number(args[0] ?? ctfProgress.revealedHints[ctfProgress.currentChallenge] + 1);
        pushTerminalOutput(revealHint(ctfProgress.currentChallenge, level));
        return;
      }

      if (command === 'submit') {
        echoCommand();
        const submitted = args.join(' ').trim();
        if (!submitted) {
          pushTerminalOutput([{ text: 'Usage: submit <flag>', kind: 'hint' }]);
          return;
        }
        const expected = ctfActiveChallenge.expectedFlag;
        if (submitted !== expected) {
          pushTerminalOutput([{ text: `Incorrect flag for Challenge ${ctfProgress.currentChallenge}.`, kind: 'error' }]);
          return;
        }

        setCtfProgress((prev) => {
          const next: CtfProgress = {
            ...prev,
            solved: { ...prev.solved, [prev.currentChallenge]: true },
          };
          if (prev.currentChallenge < 3) {
            next.currentChallenge = (prev.currentChallenge + 1) as CtfChallengeId;
          }
          return next;
        });
        const isFinal = ctfProgress.currentChallenge === 3;
        pushTerminalOutput(
          isFinal
            ? [{ text: 'Challenge 3 solved. Congrats, you completed the mini CTF!', kind: 'system' }]
            : [
                { text: `Challenge ${ctfProgress.currentChallenge} solved!`, kind: 'system' },
                { text: `Challenge ${(ctfProgress.currentChallenge + 1) as CtfChallengeId} unlocked.`, kind: 'hint' },
                ...(ctfProgress.currentChallenge === 2
                  ? [{ text: `Challenge 3 payload unlocked: ${CTF_CHALLENGE_3_ENCODED}`, kind: 'hint' as const }]
                  : []),
              ]
        );
        return;
      }

      if (command === 'restart') {
        echoCommand();
        setCtfProgress({ ...DEFAULT_CTF_PROGRESS, inMode: true });
        setCtfExpanded(false);
        pushTerminalOutput([{ text: 'CTF progress reset. Back to Challenge 1.', kind: 'system' }]);
        return;
      }
    }

    const result = executeCommand(trimmed, {
      clearHistory: () => setHistory(buildInitialTerminalHistory()),
    });

    if (result.didClear) {
      clearTyping();
      setPreviewState('default');
      setPreviewEffect('idle');
      return;
    }

    if (previewEffectTimeoutRef.current !== null) {
      window.clearTimeout(previewEffectTimeoutRef.current);
      previewEffectTimeoutRef.current = null;
    }

    const hasErrorLine = result.lines.some((line) => line.kind === 'error');
    if (hasErrorLine) {
      setPreviewEffect('error');
      previewEffectTimeoutRef.current = window.setTimeout(() => {
        setPreviewEffect('idle');
        previewEffectTimeoutRef.current = null;
      }, 620);
    }

    if (Object.hasOwn(COMMANDS, command)) {
      if (command === 'help') {
        setPreviewEffect('pulse');
        previewEffectTimeoutRef.current = window.setTimeout(() => {
          setPreviewEffect('idle');
          previewEffectTimeoutRef.current = null;
        }, 750);
      } else {
        setPreviewState(command as PreviewState);
        setPreviewEffect('spike');
        previewEffectTimeoutRef.current = window.setTimeout(() => {
          setPreviewEffect('idle');
          previewEffectTimeoutRef.current = null;
        }, 1000);
      }
    }

    const immediateCommandLines = result.lines.filter((line) => line.kind === 'command');
    const typedLines = result.lines.filter((line) => line.kind !== 'command');
    const typedLinesWithSpacing =
      typedLines.length > 0
        ? [
            { text: '\u00a0', kind: 'output' as const },
            ...typedLines,
            { text: '\u00a0', kind: 'output' as const },
          ]
        : typedLines;

    if (immediateCommandLines.length > 0) {
      setHistory((prev) => [...prev, ...immediateCommandLines]);
    }
    enqueueLines(typedLinesWithSpacing);
  };

  const renderCtfPanelContent = () => {
    const progressLabel = `Challenge ${ctfProgress.currentChallenge}/3 • ${ctfSolvedCount}/3 solved`;
    return (
      <section
        className={`preview-ctf ${ctfExpanded ? 'is-expanded' : ''}`}
        aria-label="CTF mode panel"
        data-ctf-flag={CTF_CHALLENGE_2_FLAG}
      >
        <div className="preview-ctf-top">
          <div className="preview-ctf-header">
            <h3 className="preview-ctf-title">Mini Web CTF</h3>
          </div>
          <p className="preview-ctf-rules">
            Solve challenges in order. Use terminal commands, DevTools, and decoding where prompted. Use hint buttons for
            progressively stronger clues. *Strongly Encouraged*
            <br />
            Submission format: <code>submit flag1&#123;...&#125;</code>,{' '}
            <code>submit flag2&#123;...&#125;</code>, or <code>submit flag3&#123;...&#125;</code>.
            <br />
          </p>
          <p className="preview-ctf-commands">
            Commands: <span>ctf</span>, <span>status</span>, <span>challenge &lt;n&gt;</span>, <span>hint &lt;n&gt;</span>,{' '}
            <span>submit &lt;flag&gt;</span>, <span>restart</span>, <span>quit</span>
          </p>
          <div className="preview-ctf-controls">
            <button
              type="button"
              className="preview-ctf-restart"
              onClick={() => runCommand('restart')}
            >
              Restart CTF
            </button>
            <span className="preview-ctf-progress">{progressLabel}</span>
          </div>
        </div>

        <div className="preview-ctf-cards">
          {CTF_CHALLENGES.map((challenge) => {
            const status: 'locked' | 'active' | 'completed' =
              ctfProgress.solved[challenge.id]
                ? 'completed'
                : challenge.id === ctfProgress.currentChallenge
                  ? 'active'
                  : challenge.id > ctfProgress.currentChallenge
                    ? 'locked'
                    : 'active';
            const revealed = ctfProgress.revealedHints[challenge.id];
            return (
              <article
                key={challenge.id}
                className={`preview-ctf-card preview-ctf-card-${status}`}
                aria-label={`Challenge ${challenge.id}`}
              >
                <header className="preview-ctf-card-head">
                  <h4>{challenge.title}</h4>
                  <span className={`preview-ctf-status preview-ctf-status-${status}`}>
                    {status === 'completed' ? 'Completed' : status === 'active' ? 'Active' : 'Locked'}
                  </span>
                </header>
                <p className="preview-ctf-card-desc">
                  {challenge.id === 3
                    ? `${challenge.description} ${
                        ctfProgress.solved[2]
                          ? `Encoded payload: ${CTF_CHALLENGE_3_ENCODED}`
                          : 'Complete Challenge 2 to reveal the encoded payload.'
                      }`
                    : challenge.description}
                </p>
                <div className="preview-ctf-hints">
                  {Array.from({ length: 5 }, (_, idx) => {
                    const level = idx + 1;
                    const isLockedByOrder = status === 'locked';
                    const canOpenLevel = level <= revealed + 1;
                    const isRevealed = level <= revealed;
                    return (
                      <button
                        key={`${challenge.id}-hint-${level}`}
                        type="button"
                        className={`preview-ctf-hint-btn${isRevealed ? ' is-revealed' : ''}`}
                        disabled={isLockedByOrder || !canOpenLevel}
                        onClick={() => {
                          pushTerminalOutput(revealHint(challenge.id, level));
                        }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
                {status === 'locked' ? (
                  <div className="preview-ctf-lock-overlay" aria-hidden>
                    <FontAwesomeIcon icon={faLock} />
                  </div>
                ) : null}
                {status === 'completed' ? (
                  <div className="preview-ctf-complete-overlay" aria-hidden>
                    <FontAwesomeIcon icon={faCircleCheck} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const renderPreviewContent = () => {
    const getContactHref = (label: string, value: string) => {
      if (value.startsWith('http') || value.startsWith('mailto:')) return value;
      if (label.toLowerCase() === 'email') return `mailto:${value}`;
      if (value.startsWith('github.com') || value.startsWith('linkedin.com')) return `https://${value}`;
      return value;
    };
    const getExternalHref = (value?: string) => {
      if (!value) return null;
      const normalized = value.trim();
      if (!normalized || normalized === '...') return null;
      if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('mailto:')) {
        return normalized;
      }
      if (normalized.startsWith('github.com') || normalized.startsWith('linkedin.com')) return `https://${normalized}`;
      return null;
    };

    const resumeItem = CONTACT.find((item) => item.label.toLowerCase() === 'resume');
    const resumeHrefFromContact = resumeItem ? getContactHref(resumeItem.label, resumeItem.value) : null;
    const resumeHref = resumeHrefFromContact ?? RESUME_PDF_URL;
    const resumeOpensNewTab = hrefOpensInNewTab(resumeHref);

    const renderCommandHint = (line: string) =>
      line.split(/(\s+)/).map((token, idx) => {
        const normalized = token.toLowerCase().replace(/[^a-z-]/g, '');
        const isCommand = Object.hasOwn(COMMANDS, normalized);

        return (
          <span key={`${token}-${idx}`} className={isCommand ? 'preview-cmd' : undefined}>
            {token}
          </span>
        );
      });

    const getSocialIcon = (iconKey?: string) => {
      if (iconKey === 'linkedin') return faLinkedin;
      if (iconKey === 'github') return faSquareGithub;
      if (iconKey === 'mail') return faEnvelope;
      return null;
    };

    if (previewState === 'ctf') {
      return renderCtfPanelContent();
    }

    if (previewState === 'default') {
      return (
        <div className="preview-default">
          <div className="preview-default-content">
            <h3 className="preview-name">{PREVIEW_DEFAULT_NAME}</h3>
            <p className="preview-role">{PREVIEW_DEFAULT_ROLE}</p>
            <p className="preview-tagline">{PREVIEW_DEFAULT_TAGLINE}</p>
            <p className="preview-commands">{renderCommandHint(PREVIEW_DEFAULT_COMMANDS)}</p>
          </div>
        </div>
      );
    }

    if (previewState === 'whoami') {
      return (
        <section className="preview-about">
          <div className="preview-about-top">
            <div className="preview-about-text">
              <h3 className="preview-about-title">{ABOUT_PREVIEW.title}</h3>
              {ABOUT_PREVIEW.paragraphs.map((paragraph, idx) => {
                const tryTailMatch = paragraph.match(/^(.*?)(\s+Run:\s*.+)$/i);

                if (!tryTailMatch) {
                  return <p key={`${paragraph}-${idx}`}>{paragraph}</p>;
                }

                const [, leadingText, tryTailText] = tryTailMatch;

                return (
                  <p key={`${paragraph}-${idx}`}>
                    <span>{leadingText}</span>
                    <span className="preview-about-try-inline">{renderCommandHint(tryTailText.trim())}</span>
                  </p>
                );
              })}
              <div className="preview-about-links" aria-label="Connect links">
                {SOCIAL_LINKS.map((item) => {
                  const isExternal = item.href.startsWith('http');
                  const icon = getSocialIcon(item.icon);
                  return (
                    <a
                      key={item.label}
                      className="preview-about-link"
                      href={item.href}
                      aria-label={item.label}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noreferrer' : undefined}
                    >
                      {icon ? (
                        <FontAwesomeIcon icon={icon} className="preview-about-link-icon" aria-hidden="true" />
                      ) : null}
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="preview-about-image-wrap">
              <img className="preview-about-image" src={anandImage} alt={ABOUT_PREVIEW.imageAlt} />
            </div>
          </div>
          <section className="preview-currently" aria-label="Currently">
            <h4 className="preview-currently-title">Currently</h4>
            <div className="preview-currently-grid">
              {CURRENTLY_ITEMS.map((item) => {
                const href = getExternalHref(item.href);
                const hasLink = Boolean(href);
                const imageSrc = item.imageKey ? CURRENTLY_IMAGE_MAP[item.imageKey] : undefined;

                return (
                  <article key={`${item.label}-${item.title}`} className="preview-currently-card">
                    <p className="preview-currently-label">{item.label}</p>
                    <div className="preview-currently-top">
                      {imageSrc ? (
                        <img
                          className="preview-currently-image"
                          src={imageSrc}
                          alt={item.imageAlt ?? `${item.label} thumbnail`}
                        />
                      ) : (
                        <div className="preview-currently-image preview-currently-image-placeholder" />
                      )}
                      <div className="preview-currently-meta">
                        <h5 className="preview-currently-item-title">
                          {hasLink ? (
                            <a
                              className="preview-currently-item-link"
                              href={href ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.title}
                            </a>
                          ) : (
                            item.title
                          )}
                        </h5>
                        {item.subtitle ? (
                          <p className="preview-currently-subtitle">{item.subtitle}</p>
                        ) : null}
                      </div>
                    </div>
                    <p className="preview-currently-description">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      );
    }

    if (previewState === 'projects') {
      const currentProjects = PROJECTS.filter((project) => project.status !== 'completed');
      const completedProjects = PROJECTS.filter((project) => project.status === 'completed');
      const renderProjectCards = (projects: typeof PROJECTS) =>
        projects.map((project) => {
          return (
            <article key={project.id} className="preview-project-card">
              <div className="preview-project-content">
                <h4 className="preview-project-title">{project.title}</h4>
                <div className="preview-project-summary-wrap">
                  {project.summaryLines?.length ? (
                    <ul className="preview-project-summary-list">
                      {project.summaryLines.map((line, index) => (
                        <li key={`${project.id}-summary-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="preview-project-summary-empty">Project details coming soon.</p>
                  )}
                </div>
                {project.stack?.length ? (
                  <div className="preview-project-tags" aria-label={`${project.title} stack`}>
                    {project.stack.map((tag) => (
                      <span key={`${project.id}-${tag}`} className="preview-project-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="preview-project-links">
                  {project.repoUrl ? (
                    <a className="preview-project-link" href={project.repoUrl} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  ) : null}
                  {project.liveUrl ? (
                    <a className="preview-project-link" href={project.liveUrl} target="_blank" rel="noreferrer">
                      Demo
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        });

      return (
        <section className="preview-projects" aria-label="Projects">
          <h3 className="preview-projects-title">Projects</h3>
          {currentProjects.length ? (
            <section className="preview-projects-section" aria-label="Currently working on projects">
              <h4 className="preview-projects-subtitle">Currently Working On</h4>
              <div className="preview-projects-grid">{renderProjectCards(currentProjects)}</div>
            </section>
          ) : null}
          {completedProjects.length ? (
            <section className="preview-projects-section" aria-label="Completed projects">
              <h4 className="preview-projects-subtitle">Completed</h4>
              <div className="preview-projects-grid">{renderProjectCards(completedProjects)}</div>
            </section>
          ) : null}
        </section>
      );
    }

    if (previewState === 'experience') {
      return (
        <section className="preview-experience" aria-label="Experience">
          <h3 className="preview-experience-title">Experience</h3>
          <div className="preview-experience-timeline">
            {EXPERIENCE.map((item) => (
              <article key={item.id} className="preview-experience-item">
                <div className="preview-experience-card">
                  <header className="preview-experience-head">
                    <h4 className="preview-experience-role">{item.role}</h4>
                    <p className="preview-experience-meta">
                      <span className="preview-experience-org">{item.org}</span>
                      <span className="preview-experience-period">{item.period}</span>
                    </p>
                  </header>
                  <ul className="preview-experience-highlights">
                    {item.highlights.map((point) => (
                      <li key={`${item.id}-${point}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (previewState === 'education') {
      return (
        <section className="preview-education" aria-label="Education">
          <h3 className="preview-education-title">Education</h3>
          <div className="preview-education-grid">
            {EDUCATION.map((item) => (
              <article key={item.id} className="preview-education-card">
                  <header className="preview-experience-head preview-education-head">
                    <h4 className="preview-experience-role">{item.school}</h4>
                    {item.location ? <span className="preview-education-location">{item.location}</span> : null}
                    <p className="preview-experience-meta">
                      <span className="preview-experience-org">{item.program}</span>
                      <span className="preview-experience-period">{item.period}</span>
                    </p>
                  </header>
                  <div className="preview-education-details" aria-label={`${item.school} details`}>
                    {item.gpaTechnical || item.gpaCumulative ? (
                      <article className="preview-education-detail-tile">
                        <span className="preview-education-detail-label">GPA</span>
                        <div className="preview-education-gpa-rows">
                          {item.gpaTechnical ? (
                            <p className="preview-education-gpa-row">
                              <span className="preview-education-gpa-sublabel">Technical GPA</span>
                              <span className="preview-education-gpa-value">{item.gpaTechnical}</span>
                            </p>
                          ) : null}
                          {item.gpaCumulative ? (
                            <p className="preview-education-gpa-row">
                              <span className="preview-education-gpa-sublabel">Cumulative GPA</span>
                              <span className="preview-education-gpa-value">{item.gpaCumulative}</span>
                            </p>
                          ) : null}
                        </div>
                      </article>
                    ) : item.gpa ? (
                      <article className="preview-education-detail-tile">
                        <span className="preview-education-detail-label">GPA</span>
                        <span className="preview-education-detail-value">{item.gpa}</span>
                      </article>
                    ) : null}
                    {item.honors?.length ? (
                      <article className="preview-education-detail-tile">
                        <span className="preview-education-detail-label">Honors</span>
                        <ul className="preview-education-honors-list">
                          {item.honors.map((honor) => (
                            <li key={`${item.id}-honor-${honor}`} className="preview-education-honors-item">
                              {honor}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ) : null}
                    {item.coursework?.length ? (
                      <article className="preview-education-detail-tile">
                        <span className="preview-education-detail-label">Coursework</span>
                        <div
                          className={`preview-education-coursework-scroll${item.coursework.length > 4 ? ' is-auto-scrolling' : ''}${Object.hasOwn(courseworkManualById, item.id) ? ' is-manual-scroll' : ''}`}
                          aria-label={`${item.school} coursework`}
                          onMouseEnter={(e) => {
                            e.currentTarget.scrollLeft = 0;
                            handleCourseworkMouseEnter(item.id);
                          }}
                          onMouseLeave={() => handleCourseworkMouseLeave(item.id)}
                        >
                          <div className="preview-education-coursework-track">
                            {item.coursework.map((course) => (
                              <span key={`${item.id}-course-${course}`} className="preview-education-coursework-chip">
                                {course}
                              </span>
                            ))}
                          </div>
                          {item.coursework.length > 4 && !Object.hasOwn(courseworkManualById, item.id) ? (
                            <div className="preview-education-coursework-track" aria-hidden="true">
                              {item.coursework.map((course) => (
                                <span key={`${item.id}-course-clone-${course}`} className="preview-education-coursework-chip">
                                {course}
                              </span>
                            ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ) : null}
                    {item.highlights?.length ? (
                      <article className="preview-education-detail-tile preview-education-detail-tile-prose">
                        <span className="preview-education-detail-label">Experience</span>
                        <div className="preview-education-highlights">
                          {item.highlights.map((line, hIdx) => (
                            <p key={`${item.id}-highlight-${hIdx}`} className="preview-education-highlight-p">
                              {line}
                            </p>
                          ))}
                        </div>
                      </article>
                    ) : null}
                  </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (previewState === 'resume') {
      return (
        <section className="preview-resume" aria-label="Resume">
          <article className="preview-resume-card">
            <p className="preview-resume-label">Resume</p>
            <h3 className="preview-resume-title">View My Resume</h3>
            <p className="preview-resume-subtitle">
              Open the PDF file of my Resume in a new tab.
            </p>
            <a
              className="preview-resume-link"
              href={resumeHref}
              target={resumeOpensNewTab ? '_blank' : undefined}
              rel={resumeOpensNewTab ? 'noreferrer' : undefined}
            >
              <FontAwesomeIcon icon={faFilePdf} className="preview-resume-link-icon" aria-hidden />
              <span className="preview-resume-link-text">Open resume</span>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="preview-resume-link-external" aria-hidden />
            </a>
          </article>
        </section>
      );
    }

    return <p>Preview state: {previewState}</p>;
  };

  const submitCurrentInput = () => {
    runCommand(input);
    setInput('');
  };

  const handleOutputScroll = () => {
    const el = outputRef.current;
    if (!el) return;
  
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 24;
    setShouldAutoFollow(nearBottom);
  };

  // Handles keyboard-first terminal interactions (history + autocomplete).
  const handleInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCurrentInput();
      return;
    }

    if (e.key === 'Tab') {
      const query = input.trim().toLowerCase();
      const commandNames = ctfProgress.inMode
        ? Array.from(new Set([...Object.keys(COMMANDS), ...CTF_COMMANDS]))
        : Object.keys(COMMANDS);

      // Empty input keeps default browser tab navigation.
      if (!query) {
        return;
      }

      e.preventDefault();

      const matches = commandNames.filter((name) => name.startsWith(query));

      if (matches.length === 1) {
        setInput(`${matches[0]} `);
        return;
      }

      if (matches.length > 1) {
        enqueueLines([{ text: `Suggestions: ${matches.join(', ')}`, kind: 'hint' }]);
      }

      return;
    }

    if (commandHistory.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      const nextIndex =
        historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);

      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (historyIndex === -1) return;

      const nextIndex = historyIndex + 1;

      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
        return;
      }

      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    }
  };

  useEffect(() => {
    const el = outputRef.current;
    if (!el || !shouldAutoFollow) return;

    el.scrollTop = el.scrollHeight;
  }, [history, activeTypingLines, shouldAutoFollow]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [history, activeTypingLines]);

  useEffect(() => {
    return () => {
      if (previewEffectTimeoutRef.current !== null) {
        window.clearTimeout(previewEffectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = previewOutputRef.current;
    if (!el) return;

    const handleResize = () => {
      scheduleNormalizePreviewScroll();
      syncCtfBottomMode();
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleNormalizePreviewScroll();
            syncCtfBottomMode();
          })
        : null;

    resizeObserver?.observe(el);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      if (previewScrollRafRef.current !== null) {
        window.cancelAnimationFrame(previewScrollRafRef.current);
        previewScrollRafRef.current = null;
      }
    };
  }, [scheduleNormalizePreviewScroll, syncCtfBottomMode]);

  useEffect(() => {
    const el = previewOutputRef.current;
    if (el) {
      el.scrollTop = 0;
    }

    scheduleNormalizePreviewScroll();
    syncCtfBottomMode();
  }, [previewState, scheduleNormalizePreviewScroll, syncCtfBottomMode]);

  useEffect(() => {
    scheduleNormalizePreviewScroll();
    syncCtfBottomMode();
  }, [previewEffect, scheduleNormalizePreviewScroll, syncCtfBottomMode]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      syncCtfBottomMode();
    });
    return () => window.cancelAnimationFrame(id);
  }, [ctfProgress.inMode, ctfExpanded, previewState, syncCtfBottomMode]);

  return (
    <main className="app-shell">
      <section className="window-panel terminal-panel">
        <div className="window-shell">
          <div className="window-titlebar" aria-hidden="true">
            <div className="window-tab">
              <FontAwesomeIcon icon={faTerminal} className="window-tab-icon" />
              <span className="window-tab-label">Autobhat Terminal</span>
            </div>
          </div>

          <div className="window-body terminal-body">
            <div
              ref={outputRef}
              onScroll={handleOutputScroll}
              className="terminal-output"
              onClick={() => inputRef.current?.focus()}
            >
              {history.map((line, idx) => (
                <p key={`${line.text}-${idx}`} className={`line-${line.kind}`}>
                  {line.kind === 'command' ? (
                    <>
                      {renderPrompt()}
                      {line.text}
                    </>
                  ) : (
                    renderTerminalLine(line)
                  )}
                </p>
              ))}
              {activeTypingLines.map((entry) => {
                return (
                  <p key={entry.id} className={`line-${entry.line.kind} line-typing-active`}>
                    {renderTerminalLine(entry.line, entry.visibleChars)}
                  </p>
                );
              })}

              <div className="terminal-active-prompt-line">
                <label className="terminal-prompt" htmlFor="terminal-input">
                  {renderPrompt()}
                </label>
                <input
                  ref={inputRef}
                  id="terminal-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="window-panel preview-panel">
        <div className="window-shell">
          <div className="window-titlebar" aria-hidden="true">
            <div className="window-tab">
              <FontAwesomeIcon icon={previewTabIcon} className="window-tab-icon" />
              <span className="window-tab-label">{previewTabLabel}</span>
            </div>
          </div>
          <div className="window-body preview-body">
            <div
              ref={previewOutputRef}
              className={`preview-output preview-output-${previewState} preview-effect-${previewEffect}${ctfProgress.inMode ? ' preview-ctf-active' : ''}${ctfBottomMode === 'sticky' ? ' preview-ctf-needs-scroll' : ''}`}
            >
              <div className="preview-output-scroll">{renderPreviewContent()}</div>
              {ctfProgress.inMode ? (
                <div className={`preview-ctf-bottom-stack is-${ctfBottomMode}${ctfExpanded ? ' is-expanded' : ''}`}>
                  {ctfExpanded && previewState !== 'ctf' ? (
                    <div className="preview-ctf-drawer" role="dialog" aria-label="CTF drawer">
                      {renderCtfPanelContent()}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="preview-ctf-bottom-rail"
                    onClick={() => {
                      setCtfExpanded((prev) => !prev);
                    }}
                    aria-expanded={ctfExpanded}
                  >
                    <span className="preview-ctf-bottom-card">
                      <span className="preview-ctf-bottom-label">
                        <span>CTF ACTIVE</span>
                        <span>{`Challenge ${ctfProgress.currentChallenge}/3 • ${ctfSolvedCount}/3 solved`}</span>
                      </span>
                      <span className="preview-ctf-bottom-toggle">
                        {ctfExpanded ? 'Collapse' : 'Expand'}
                        <FontAwesomeIcon icon={ctfExpanded ? faChevronDown : faChevronUp} aria-hidden />
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default App;