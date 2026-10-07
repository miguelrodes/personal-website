export type Visual = {
  src: string | null;
  alt: string;
  label: string;
  caption: string;
  aspectRatio?: string;
};

export type SectionId = "intro" | "problem" | "context" | "process" | "outcome";

export type ProjectSection = {
  id: SectionId;
  title: string;
  text: string;
  visual: Visual;
};

export type Project = {
  slug: string;
  number: string;
  title: string;
  group: "Aldea Ventures" | "Independent work";
  accent: "blue" | "orange";
  discipline: string;
  role: string;
  period: string;
  technologies: string[] | null;
  summary: string;
  preview: Visual;
  sections: ProjectSection[];
  media: {
    demoUrl: string | null;
    repositoryUrl: string | null;
    loomUrl: string | null;
    demoPoster: Visual | null;
    walkthroughPoster: Visual | null;
  };
};

export const profile = {
  name: "Miguel Rodés Knuth",
  descriptor: "Product Design & Full-Stack Development",
  location: "Boston, MA",
  email: "miguelrodes24@gmail.com",
  linkedin: "https://www.linkedin.com/in/miguel-rodes/",
  github: "https://github.com/miguelrodes",
  availability: "January–June 2027",
  academicStatement:
    "Computer Science & Philosophy Major, Minor in Economics | Northeastern University, Boston | Aspiring to Work in Frontier Technologies (AI & Web3).",
  bio: "I design and build software for investor reporting, investment analysis, and event management. I’m exploring opportunities in product management, product design, and full-stack development.",
  resumeUrl: "/miguel-rodes-knuth-resume.pdf",
  portrait: {
    src: null,
    alt: "Portrait of Miguel Rodés Knuth",
    label: "Portrait",
    caption: "Miguel Rodés Knuth · Boston, MA",
    aspectRatio: "4 / 5",
  } satisfies Visual,
  banner: {
    enabled: false,
    visual: {
      src: null,
      alt: "Shallow profile banner for Miguel Rodés Knuth",
      label: "Profile banner",
      caption: "",
      aspectRatio: "6 / 1",
    } satisfies Visual,
  },
};

export const projects: Project[] = [
  {
    slug: "aldea-investor-portal",
    number: "01",
    title: "Aldea Investor Portal",
    group: "Aldea Ventures",
    accent: "blue",
    discipline: "Product design · Full-stack development",
    role: "Product Designer & Full-Stack Developer; sole developer",
    period: "May–August 2026",
    technologies: ["React", "TypeScript", "Supabase"],
    summary:
      "An interactive reporting portal for exploring fund performance, comparing quarters, and drilling into 1,000+ underlying companies across 28 funds.",
    preview: {
      src: null,
      alt: "Aldea Investor Portal fund overview screenshot placeholder",
      label: "Fund overview",
      caption: "Fund performance and the companies behind it.",
      aspectRatio: "8 / 5",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "I designed and built Aldea’s investor-reporting portal as the sole developer, working under Andrew Padilla. It turns quarterly portfolio information into an interactive interface for exploring funds and the companies behind them.",
        visual: {
          src: null,
          alt: "Placeholder for an overview of funds in the Aldea Investor Portal",
          label: "Fund overview",
          caption: "An overview of the portfolio’s funds.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Static quarterly PDFs provide a fixed view of fund performance. The portal brings that information into a format where users can compare periods and explore individual investments.",
        visual: {
          src: null,
          alt: "Placeholder for a quarter-to-quarter fund performance comparison",
          label: "Quarterly comparison",
          caption: "Comparing fund performance across reporting periods.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "The reporting scope covered 28 portfolio funds and 1,000+ underlying companies. The initial operational version served Aldea’s internal employees and administrators.",
        visual: {
          src: null,
          alt: "Placeholder for a company drill-down within the fund reporting interface",
          label: "Company drill-down",
          caption: "Exploring the underlying companies within a fund.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "I built the interface in React and TypeScript, with Supabase supporting the data and authentication. I also implemented Excel parsing and Airtable ingestion to feed reporting workflows and generate quarterly PDFs from updated figures and commentary.",
        visual: {
          src: null,
          alt: "Placeholder for a sample quarterly reporting output from the portal",
          label: "Sample reporting output",
          caption: "Quarterly figures and commentary brought into a report.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "By the end of August 2026, the portal was operational for internal use. It supported portfolio exploration, quarter-to-quarter comparisons, and drill-down views of underlying companies.",
        visual: {
          src: null,
          alt: "Placeholder for portfolio exploration in the operational investor portal",
          label: "Portfolio exploration",
          caption:
            "Funds, reporting periods, and underlying investments in one interface.",
          aspectRatio: "8 / 5",
        },
      },
    ],
    media: {
      demoUrl: null,
      repositoryUrl: null,
      loomUrl: null,
      demoPoster: {
        src: null,
        alt: "Placeholder for the investor portal demo using synthetic sample data",
        label: "Portal demo",
        caption: "Explore the reporting interface using sample data.",
        aspectRatio: "16 / 9",
      },
      walkthroughPoster: {
        src: null,
        alt: "Placeholder for the Aldea Investor Portal video walkthrough",
        label: "Portal walkthrough",
        caption: "Aldea Investor Portal · Product walkthrough",
        aspectRatio: "16 / 9",
      },
    },
  },
  {
    slug: "aldea-investor-simulation",
    number: "02",
    title: "Aldea Investor Simulation",
    group: "Aldea Ventures",
    accent: "blue",
    discipline: "Investment modeling · Development",
    role: "Co-developer",
    period: "May–August 2026",
    technologies: null,
    summary:
      "A scenario tool for exploring how investment exits could affect portfolio holdings, investor distributions, and the fund’s projected J-curve.",
    preview: {
      src: null,
      alt: "Aldea Investor Simulation projected J-curve screenshot placeholder",
      label: "Projected J-curve",
      caption: "Exploring the projected effects of an investment exit.",
      aspectRatio: "8 / 5",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "I co-developed an investment scenario simulator with a fellow developer at Aldea. It models how selling fund stakes or portfolio-company holdings could affect the wider portfolio.",
        visual: {
          src: null,
          alt: "Placeholder for investment exit assumptions in the scenario simulator",
          label: "Exit assumptions",
          caption: "Setting up a hypothetical investment exit.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "An investment exit can affect holdings, distributions, and projected fund performance together. The simulator was built to make those relationships visible within a scenario.",
        visual: {
          src: null,
          alt: "Placeholder for projected holdings and investor distributions in an exit scenario",
          label: "Holdings & distributions",
          caption: "The connected effects of a modeled sale.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "The tool explores hypothetical exits, with outputs that depend on the assumptions entered. I worked on its development with a peer.",
        visual: {
          src: null,
          alt: "Placeholder for configurable assumptions used in hypothetical exit calculations",
          label: "Scenario assumptions",
          caption: "Projected outputs depend on the assumptions entered.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "We modeled investment sales and their projected effects on holdings, investor distributions, and the J-curve. The work combined scenario calculations with visual explanations of the output.",
        visual: {
          src: null,
          alt: "Placeholder for a projected J-curve showing the effects of a hypothetical investment sale",
          label: "Projected J-curve",
          caption: "Visualizing projected fund performance within a scenario.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "The resulting simulator brings hypothetical exits and their projected portfolio effects into one workflow. Users can inspect the modeled holdings, distributions, and J-curve associated with a scenario.",
        visual: {
          src: null,
          alt: "Placeholder for modeled holdings and distributions in the simulator output",
          label: "Scenario output",
          caption:
            "Modeled holdings, distributions, and fund performance together.",
          aspectRatio: "8 / 5",
        },
      },
    ],
    media: {
      demoUrl: null,
      repositoryUrl: null,
      loomUrl: null,
      demoPoster: null,
      walkthroughPoster: null,
    },
  },
  {
    slug: "aldea-helios",
    number: "03",
    title: "Aldea Helios",
    group: "Aldea Ventures",
    accent: "blue",
    discipline: "Platform development · Data",
    role: "Platform development and data contributions",
    period: "May–August 2026",
    technologies: null,
    summary:
      "Data and reliability improvements to Aldea’s investment-intelligence platform, supporting company tracking across 1,200+ companies.",
    preview: {
      src: null,
      alt: "Aldea Helios company intelligence view screenshot placeholder",
      label: "Company intelligence",
      caption: "Company tracking within Aldea’s existing platform.",
      aspectRatio: "8 / 5",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "I contributed to Helios, Aldea’s existing investment-intelligence platform, working alongside Andrew Padilla. My focus was bug fixing, company-record reconciliation, and data mapping.",
        visual: {
          src: null,
          alt: "Placeholder for the company intelligence view in the existing Helios platform",
          label: "Company intelligence view",
          caption: "The existing platform for investment intelligence.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Company tracking depends on records that connect consistently across the platform. My work addressed bugs, duplicate records, and mismatched data.",
        visual: {
          src: null,
          alt: "Placeholder for company-record relationships and data mappings in Helios",
          label: "Company-record relationships",
          caption:
            "Connecting company records consistently across the platform.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "Helios supported tracking across 1,200+ companies. I worked within its existing data model and interface, contributing focused improvements alongside Andrew.",
        visual: {
          src: null,
          alt: "Placeholder for company information within the existing Helios interface",
          label: "Existing company view",
          caption: "Working within an established interface and data model.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "I investigated bugs, reviewed data mappings, and reconciled company records. I also checked the platform’s design and data model to support ongoing cleanup and maintenance.",
        visual: {
          src: null,
          alt: "Placeholder for an illustrated example of a Helios record reconciliation or mapping contribution",
          label: "Platform contribution",
          caption: "A focused record reconciliation or mapping improvement.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "I delivered bug fixes, record reconciliation, and mapping improvements for the existing platform. These contributions supported Aldea’s ongoing company-tracking workflow.",
        visual: {
          src: null,
          alt: "Placeholder for an example of updated company-record relationships in Helios",
          label: "Company-record mapping",
          caption: "Supporting the ongoing company-tracking workflow.",
          aspectRatio: "8 / 5",
        },
      },
    ],
    media: {
      demoUrl: null,
      repositoryUrl: null,
      loomUrl: null,
      demoPoster: null,
      walkthroughPoster: null,
    },
  },
  {
    slug: "kuspace",
    number: "04",
    title: "KUSPACE",
    group: "Independent work",
    accent: "orange",
    discipline: "Product design · Full-stack development",
    role: "Product Designer & Full-Stack Developer; sole developer",
    period: "October 2025–June 2026",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "PostgreSQL",
      "Prisma",
      "Stripe",
    ],
    summary:
      "An event-management MVP for organizers and nightclubs, bringing event setup, scheduling, lineups, budgets, guestlists, and ticketing into one product.",
    preview: {
      src: null,
      alt: "KUSPACE event management workspace screenshot placeholder",
      label: "Event workspace",
      caption: "Event operations in one workspace.",
      aspectRatio: "8 / 5",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "I designed and developed KUSPACE’s event-management MVP as the sole developer. I owned product requirements, UI/UX, and the full-stack implementation for nightclubs and event organizers.",
        visual: {
          src: null,
          alt: "Placeholder for the KUSPACE event operations workspace",
          label: "Event workspace",
          caption: "A workspace for nightclubs and event organizers.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Organizing an event involves coordinating schedules, performers, budgets, guests, and tickets. KUSPACE was designed to bring those connected workflows into one workspace.",
        visual: {
          src: null,
          alt: "Placeholder for scheduling and performer lineups in KUSPACE",
          label: "Scheduling & lineups",
          caption: "Coordinating event schedules and performers.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "The MVP covered event operations with authentication and scoped access to organization data. I was responsible for both the product design and the working application.",
        visual: {
          src: null,
          alt: "Placeholder for event budgets and guestlists within KUSPACE",
          label: "Budgets & guestlists",
          caption: "Event information scoped to each organization.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "I built the application with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma. I implemented authentication, scoped access, and Stripe Connect Checkout with signature-verified webhook fulfillment for ticketing. I used Claude Code, Codex, and Antigravity during development and interface refinement.",
        visual: {
          src: null,
          alt: "Placeholder for KUSPACE ticket checkout with Stripe Connect",
          label: "Ticket checkout",
          caption: "The implemented ticket checkout flow.",
          aspectRatio: "8 / 5",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "The MVP combines event operations and an implemented ticketing flow in a single application. The project spans product definition, interface design, data modeling, authentication, and checkout implementation.",
        visual: {
          src: null,
          alt: "Placeholder for the KUSPACE event-management MVP overview",
          label: "Event-management MVP",
          caption: "Event operations and ticketing in a single application.",
          aspectRatio: "8 / 5",
        },
      },
    ],
    media: {
      demoUrl: null,
      repositoryUrl: null,
      loomUrl: null,
      demoPoster: {
        src: null,
        alt: "Placeholder for a KUSPACE event-management product demo",
        label: "KUSPACE demo",
        caption: "Demo coming soon",
        aspectRatio: "16 / 9",
      },
      walkthroughPoster: {
        src: null,
        alt: "Placeholder for the KUSPACE product video walkthrough",
        label: "KUSPACE walkthrough",
        caption: "KUSPACE · Product walkthrough",
        aspectRatio: "16 / 9",
      },
    },
  },
];
