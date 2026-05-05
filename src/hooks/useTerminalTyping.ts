import { useEffect, useRef, useState } from 'react';
import type { TerminalLine } from '../core/types';

type ActiveTypingLine = {
  id: number;
  line: TerminalLine;
  visibleChars: number;
  waitMs: number;
};

type UseTerminalTypingOptions = {
  maxConcurrentTypingLines: number;
  overlapStartRatio: number;
  typingTickMs: number;
  onCommitLines: (lines: TerminalLine[]) => void;
};

const getLineText = (line: TerminalLine) => {
  if (line.segments && line.segments.length > 0) {
    return line.segments.map((segment) => segment.text).join('');
  }
  return line.text;
};

export const useTerminalTyping = ({
  maxConcurrentTypingLines,
  overlapStartRatio,
  typingTickMs,
  onCommitLines,
}: UseTerminalTypingOptions) => {
  const [typingQueue, setTypingQueue] = useState<TerminalLine[]>([]);
  const [activeTypingLines, setActiveTypingLines] = useState<ActiveTypingLine[]>([]);
  const typingIdRef = useRef(0);
  const onCommitLinesRef = useRef(onCommitLines);

  useEffect(() => {
    onCommitLinesRef.current = onCommitLines;
  }, [onCommitLines]);

  const enqueueLines = (lines: TerminalLine[]) => {
    if (lines.length === 0) return;
    setTypingQueue((prev) => [...prev, ...lines]);
  };

  const clearTyping = () => {
    setTypingQueue([]);
    setActiveTypingLines([]);
  };

  useEffect(() => {
    if (typingQueue.length === 0) return;
    if (activeTypingLines.length >= maxConcurrentTypingLines) return;

    const isHelpFlowActive =
      activeTypingLines.some((entry) => (entry.line.kind as string) === 'help') ||
      (typingQueue[0]?.kind as string | undefined) === 'help';
    if (isHelpFlowActive && activeTypingLines.length > 0) return;

    if (activeTypingLines.length > 0) {
      const latest = activeTypingLines[activeTypingLines.length - 1];
      const latestLineLength = Math.max(1, getLineText(latest.line).length);
      const latestProgress = latest.visibleChars / latestLineLength;
      if (latestProgress < overlapStartRatio) return;
    }

    const [nextLine, ...rest] = typingQueue;
    setTypingQueue(rest);
    setActiveTypingLines((prev) => [
      ...prev,
      {
        id: typingIdRef.current++,
        line: nextLine,
        visibleChars: 0,
        waitMs: 0,
      },
    ]);
  }, [activeTypingLines, maxConcurrentTypingLines, overlapStartRatio, typingQueue]);

  useEffect(() => {
    if (activeTypingLines.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      setActiveTypingLines((prev) =>
        prev.map((entry) => {
          const fullText = getLineText(entry.line);

          if (entry.visibleChars >= fullText.length) return entry;

          if (entry.waitMs > typingTickMs) {
            return { ...entry, waitMs: entry.waitMs - typingTickMs };
          }

          const currentChar = fullText[entry.visibleChars];
          const isPunctuation = currentChar ? '.,:;!?'.includes(currentChar) : false;
          const delayMs = currentChar === ' ' ? 2 : isPunctuation ? 20 : 8;

          return {
            ...entry,
            visibleChars: entry.visibleChars + 1,
            waitMs: delayMs,
          };
        })
      );
    }, typingTickMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeTypingLines, typingTickMs]);

  useEffect(() => {
    if (activeTypingLines.length === 0) return;

    let completedPrefixCount = 0;
    for (const entry of activeTypingLines) {
      const lineLength = getLineText(entry.line).length;
      if (entry.visibleChars >= lineLength) {
        completedPrefixCount += 1;
        continue;
      }
      break;
    }

    if (completedPrefixCount === 0) return;

    const committed = activeTypingLines
      .slice(0, completedPrefixCount)
      .map((entry) => entry.line);
    onCommitLinesRef.current(committed);
    setActiveTypingLines((prev) => prev.slice(completedPrefixCount));
  }, [activeTypingLines]);

  return {
    activeTypingLines,
    enqueueLines,
    clearTyping,
  };
};
