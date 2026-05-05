import { type KeyboardEventHandler, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
  faBriefcase,
  faCodeBranch,
  faEnvelope,
  faFileLines,
  faGraduationCap,
  faTerminal,
  faUser,
  faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { COMMANDS } from './core/commands';
import {
  ABOUT_PREVIEW,
  ASCII_HEADER,
  CONTACT,
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
import anandImage from './assets/Profile_Pic.jpg';
import avatarPhoto from './assets/Avatar_Photo.png';
import cliImage from './assets/CLI_Image.png';
import portfolioImage from './assets/Porfolio.png';
import redRisingPhoto from './assets/Red_Rising_Photo.jpg';
import { executeCommand } from './core/runner';
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
  | 'resume';
type PreviewEffect = 'idle' | 'pulse' | 'spike' | 'error';

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

function App() {
  const maxConcurrentTypingLines = 3;
  const overlapStartRatio = 0.2;
  const typingTickMs = 8;
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([
    ...ASCII_HEADER.map((text) => ({ text, kind: 'ascii' as const })),
    { text: '', kind: 'system' },
    {
      text: 'Welcome. Type \'help\' to see commands.',
      kind: 'system',
      segments: [
        { text: "Welcome. Type '" },
        { text: 'help', tone: 'hint' },
        { text: "' to see commands." },
      ],
    },
  ]);
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
  const previewTabLabel =
    previewState === 'default' ? 'Welcome' : previewState.charAt(0).toUpperCase() + previewState.slice(1);
  const previewTabIcon =
    previewState === 'default'
      ? faWaveSquare
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

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const command = trimmed.toLowerCase();

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const result = executeCommand(trimmed, {
      clearHistory: () => setHistory([]),
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
    const resumeHref = resumeItem ? getContactHref(resumeItem.label, resumeItem.value) : '#';

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
              Download the latest version for full experience, projects, and education details.
            </p>
            <a
              className="preview-resume-link"
              href={resumeHref}
              target={resumeHref.startsWith('http') ? '_blank' : undefined}
              rel={resumeHref.startsWith('http') ? 'noreferrer' : undefined}
            >
              Open Resume
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
      const commandNames = Object.keys(COMMANDS);

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
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleNormalizePreviewScroll();
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
  }, [scheduleNormalizePreviewScroll]);

  useEffect(() => {
    const el = previewOutputRef.current;
    if (el) {
      el.scrollTop = 0;
    }

    scheduleNormalizePreviewScroll();
  }, [previewState, scheduleNormalizePreviewScroll]);

  useEffect(() => {
    scheduleNormalizePreviewScroll();
  }, [previewEffect, scheduleNormalizePreviewScroll]);

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
              className={`preview-output preview-output-${previewState} preview-effect-${previewEffect}`}
            >
              <div className="preview-output-scroll">{renderPreviewContent()}</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default App;