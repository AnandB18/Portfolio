import type { ContactLink, Experience, Project, CurrentlyItem, Education } from './types';

export const ASCII_HEADER: string[] = [
  '  ____             __  _____      ___      ',
  ' / __ \\____  _____/ /_/ __(_)____/ (_)___ _',
  '/ /_/ / __ \\/ ___/ __/ /_/ / ___/ / / __ `/',
  '/ ____/ /_/ / /  / /_/ __/ / /  / / / /_/ / ',
  '/_/    \\____/_/   \\__/_/ /_/_/  /_/_/\\__,_/',
];

export const ABOUT_LINES: string[] = [
  'I am Anand...',
  'This portfolio is a terminal-inspired interface.',
  'Try: projects, experience, contact',
];

export const PREVIEW_DEFAULT_NAME = 'Anand Bhat';
export const PREVIEW_DEFAULT_ROLE = 'Computer Science Student @ George Washington University';
export const PREVIEW_DEFAULT_TAGLINE = 'Focused on systems, cybersecurity, and practical software engineering.';
export const PREVIEW_DEFAULT_COMMANDS = 'Try: whoami, experience, or projects to learn more about me.';

export const PROJECTS_HEADER = 'Projects:';
export const PROJECTS_FOOTER = 'Project details panel wiring comes next.';
export const EXPERIENCE_HEADER = 'Experience:';
export const EDUCATION_HEADER = 'Education:';
export const RESUME_HEADER = 'Resume:';

export const ABOUT_PREVIEW = {
  imageAlt: 'Photo of Anand Bhat',
  title: 'WHOAMI',
  paragraphs: [
    'Hello, I am Anand!', 
    'I am currently pursuing a BS in Computer Science at The George Washington University. Run: education',
    'Upcoming, I will be researching UAV anomaly detection at the GWU Security and Systems Lab under the guidence of Dr. Sibin Mohan. Run: experience',
    'Outside of school, I enjoy anything sports related, winding down with a good book, and exploring new tools and technologies through side projects. Run: projects',
    'You can contact me via the links below. Thank you for visiting my portfolio!'
  ],
};

export const CURRENTLY_ITEMS: CurrentlyItem[] = [
  { label: 'Learning', title: 'TUI/CLI Development', description: 'I have been learning about TUI/CLI app development.  I have  started by trying to implement my portfolio as a TUI/CLI app.', imageKey: 'learning-image', imageAlt: 'TUI/CLI Development' },
  { label: 'Building', title: 'Terminal Style Portfolio', description: 'I have been working on my portfolio for the past few weeks and I have begun to implement my portfolio as a TUI/CLI app.', imageKey: 'building-image', imageAlt: 'Terminal Style Portfolio' },
  { label: 'Reading', title: 'Red Rising', subtitle: 'By: Pierce Brown', description: 'A great sci-fi/fantasy dystopian novel that has been making it difficult to put down. I will definetly read the 5 other books in this series after I finish this book.', imageKey: 'reading-image', imageAlt: 'Red Rising Book Cover' },
  { label: 'Watching', title: 'Avatar: The Last Airbender (Live Action)', subtitle: 'Netflix Series', description: 'I got into animated films and shows this year and so I just finsihed rewatching the animated series.  Now I am looking forward to watching the live action sereis.', imageKey: 'watching-image', imageAlt: 'Avatar: The Last Airbender (Live Action) Poster' },
];

export const SOCIAL_LINKS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/abhat21/', icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/AnandB18', icon: 'github' },
  { label: 'Email', href: 'mailto: anvenbha1@gmail.com' , icon: 'mail' },
];

export const PROJECTS: Project[] = [
  {
    id: 'portfolio',
    title: 'Terminal Portfolio (CLI/TUI in progress)',
    status: 'current',
    summaryLines: [
      'Keyboard-first terminal portfolio built with React, TypeScript, and Vite.',
      'Command routing, history, autocomplete, and a richer preview pane.',
      'Go CLI/TUI in progress—reuses the same exported JSON as the web app.',
      'Deployed web build is the stable baseline while the TUI catches up.',
    ],
    stack: ['React', 'TypeScript', 'Vite', 'Go', 'CSS'],
    imageKey: 'project-portfolio',
    imageAlt: 'Terminal Portfolio — web UI plus Go TUI scaffold',
    repoUrl: 'https://github.com/AnandB18/Portfolio',
  },
  {
    id: 'shell',
    title: 'Mini Shell (msh)',
    status: 'completed',
    summaryLines: [
      'Minimal Unix shell written in C for GWU Systems Programming.',
      'Pipelines, fork/exec, redirection, and foreground/background jobs.',
      'Handles SIGINT, SIGTSTP, and SIGCHLD for sane Ctrl+C / Ctrl+Z behavior.',
      'Interactive input via Linenoise; focus on process control and pipes.',
    ],
    stack: ['C', 'POSIX', 'GNU Make', 'Linenoise'],
    imageKey: 'project-shell',
    imageAlt: 'Mini Shell (msh) — Unix shell project',
    repoUrl: 'https://github.com/AnandB18/mini_shell',
  },
  {
    id: 'gcal-planner',
    title: 'GCal Planner',
    status: 'current',
    summaryLines: [
      'Links goals → projects → tasks with Google Calendar and Google Tasks.',
      'Incremental task sync, dashboard views, and calendar-backed scheduling.',
      'MVP is usable; polish continues and pace is slow while paused.',
    ],
    stack: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Auth.js', 'Google APIs', 'Tailwind CSS'],
    imageKey: 'project-planner',
    imageAlt: 'GCal Planner — Google Calendar & Tasks sync',
    repoUrl: 'https://github.com/AnandB18/gcal_planner',
  },
  {
    id: 'kanban-board',
    title: 'Kanban MVP',
    status: 'completed',
    summaryLines: [
      'Dark-themed Kanban board with drag-and-drop columns.',
      'Task CRUD and workflows backed by Supabase auth and storage.',
      'Built with React, TypeScript, Vite, and dnd-kit.',
    ],
    stack: ['React', 'TypeScript', 'Vite', 'Supabase', 'dnd-kit'],
    repoUrl: 'https://github.com/AnandB18/Kanban_Board',
    liveUrl: 'https://kanban-board-ebon-eta.vercel.app/',
  },
];

export const EXPERIENCE: Experience[] = [
  {
    id: 'research-fellow',
    role: 'Undergraduate Research Fellow',
    org: 'The George Washington University',
    period: 'May 2026 - Present',
    highlights: [
      'Selected for GWU\'s Summer Undergraduate Program for Engineering Research (SUPER).',
      'Researching UAV anomaly detection under the guidance of Dr. Sibin Mohan.',
    ],
  },
  {
    id: 'teaching-assistant-systems',
    role: 'Intro to Systems Programming Teaching Assistant',
    org: 'GWU School of Engineering & Applied Science',
    period: 'June 2025 - December 2025',
    highlights: [
      'Mentored 30+ students in core systems concepts, including C programming, pointers, memory management, and process control.',
      'Led my own lab section, teaching core concepts and walking students through implementation and debugging strategies.',
      'Collaborated with course staff to refine labs and instructional materials, aligning weekly objectives across sections.',
    ],
  },
  {
    id: 'teaching-assistant-ads',
    role: 'Intro to Algorithms and Data Structures Teaching Assistant',
    org: 'GWU School of Engineering & Applied Science',
    period: 'June 2024 - December 2025',
    highlights: [
      'Mentored 30+ students to strengthen conceptual understanding of fundamental data structures and algorithms through Java.',
      'Led my own lab section, teaching problem-solving approaches and guiding students through implementation and debugging workflows.',
      'Partnered with faculty and fellow TAs to refine coursework, develop lab materials, and align weekly instructional goals.',
    ],
  },
];

export const EDUCATION: Education[] = [
  {
    id: 'gw-bs-cs',
    school: 'The George Washington University',
    program: 'Bachelor of Science in Computer Science',
    period: 'Expected Graduation: May 2027',
    location: 'Washington, DC',
    gpaTechnical: '3.96',
    gpaCumulative: '3.83',
    honors: ['Tau Beta Pi Engineering Honors Society (Fall 2025 - Present)', '2025 Outstanding Academic Achievement Award','Dean\'s List (Fall 2023, Spring 2024, Fall 2024, Spring 2025)', 'Presidential Scholarship Academic Recipient'],
    coursework: ['Intro to AI', 'Intro to Systems Programming', 'Intro to Computer Security', 'Operating Systems', 'Computer Architecture', 'Algorithms and Data Structures'],
  },
  {
    id: 'ucd-stdyabrd',
    school: 'University College Dublin',
    program: 'Study Abroad',
    period: 'January 2026 - May 2026',
    location: 'Dublin, Ireland',
    highlights: [
      'I chose study abroad first and foremost to travel, experience a new cultureimage.png, and learn outside a typical classroom setting.',
      'Dublin also sits in a growing European tech hub, so I was excited to take classes and explore the city while seeing how industry and startups show up day to day.',
    ],
  }
];

export const CONTACT: ContactLink[] = [ 
  { label: 'Email', value: 'anvenbha1@gmail.com' },
  { label: 'GitHub', value: 'github.com/AnandB18' },
  { label: 'LinkedIn', value: 'linkedin.com/in/abhat21/' },
];

