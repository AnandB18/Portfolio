import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ASCII_HEADER,
  ABOUT_LINES,
  PREVIEW_DEFAULT_NAME,
  PREVIEW_DEFAULT_ROLE,
  PREVIEW_DEFAULT_TAGLINE,
  PROJECTS,
  EXPERIENCE,
  EDUCATION,
  CONTACT,
} from '../src/core/data.ts';

type SharedPortfolioData = {
  asciiHeader: string[];
  aboutLines: string[];
  preview: {
    name: string;
    role: string;
    tagline: string;
  };
  projects: Array<{
    id: string;
    title: string;
    summaryLines?: string[];
    stack?: string[];
  }>;
  experienceLines: string[];
  educationLines: string[];
  contacts: Array<{
    label: string;
    value: string;
  }>;
};

const toExperienceLines = () =>
  EXPERIENCE.flatMap((item) => [
    `${item.role} | ${item.org} | ${item.period}`,
    ...item.highlights.map((point) => `  ${point}`),
  ]);

const toEducationLines = () =>
  EDUCATION.flatMap((item) => {
    const gpaLine =
      item.gpaTechnical || item.gpaCumulative
        ? `  GPA: ${[
            item.gpaTechnical ? `Technical ${item.gpaTechnical}` : '',
            item.gpaCumulative ? `Cumulative ${item.gpaCumulative}` : '',
          ]
            .filter(Boolean)
            .join(' | ')}`
        : item.gpa
          ? `  GPA: ${item.gpa}`
          : null;

    return [
    `${item.program} | ${item.school} | ${item.period}`,
    ...(item.location ? [`  Location: ${item.location}`] : []),
    ...(gpaLine ? [gpaLine] : []),
    ...(item.honors?.length ? [`  Honors: ${item.honors.join(', ')}`] : []),
    ...(item.coursework?.length ? [`  Coursework: ${item.coursework.join(', ')}`] : []),
    ...(item.highlights ?? []).map((point) => `  ${point}`),
    ];
  });

const buildPayload = (): SharedPortfolioData => ({
  asciiHeader: ASCII_HEADER,
  aboutLines: ABOUT_LINES,
  preview: {
    name: PREVIEW_DEFAULT_NAME,
    role: PREVIEW_DEFAULT_ROLE,
    tagline: PREVIEW_DEFAULT_TAGLINE,
  },
  projects: PROJECTS.map((project) => ({
    id: project.id,
    title: project.title,
    summaryLines: project.summaryLines,
    stack: project.stack,
  })),
  experienceLines: toExperienceLines(),
  educationLines: toEducationLines(),
  contacts: CONTACT.map((item) => ({
    label: item.label,
    value: item.value,
  })),
});

const main = async () => {
  const outDir = resolve(process.cwd(), 'shared');
  const outFile = resolve(outDir, 'portfolio-data.json');

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(buildPayload(), null, 2)}\n`, 'utf8');
  console.log(`Exported shared data to ${outFile}`);
};

main().catch((error) => {
  console.error('Failed to export shared data:', error);
  process.exit(1);
});
