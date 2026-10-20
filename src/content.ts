export type Visual = {
  src: string | null;
  alt: string;
  label: string;
  caption: string;
  aspectRatio?: string;
  objectPosition?: string;
};

export type SectionId = "intro" | "problem" | "context" | "process" | "outcome";

export type ProjectSection = {
  id: SectionId;
  title: string;
  text: string;
  links?: { text: string; href: string }[];
  bold?: string[];
  visual: Visual | Visual[];
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
  availability: "January - June 2027",
  academicStatement: "B.S. in Computer Science & Philosophy\u2002|\u2002Minor in Economics",
  educationStatement:
    "Northeastern University\u2002|\u2002Khoury College of Computer Science\u2002|\u2002Expected May 2028",
  bio: "I'm particularly interested in the intersection of product management, design, and engineering, combining technical development with user experience. I have experience designing and building software solutions at Aldea Ventures and developing full-stack applications like KUSPACE. I aspire to work in frontier technologies, particularly AI and Web3.",
  resumeUrl: "/miguel-rodes-knuth-resume.pdf",
  resumeFilename: "Miguel-Rodes-Knuth-Resume.pdf",
  portrait: {
    src: "/images/miguel-rodes-knuth-profile.png",
    alt: "Portrait of Miguel Rodés Knuth",
    label: "Portrait",
    caption: "Miguel Rodés Knuth - Boston, MA",
    aspectRatio: "4 / 5",
  } satisfies Visual,
  banner: {
    enabled: true,
    visual: {
      src: "/images/coastal-banner.png",
      alt: "",
      label: "Coastal landscape",
      caption: "",
      aspectRatio: "4 / 1",
      objectPosition: "50% 53%",
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
    discipline: "Product design | Full-stack development",
    role: "Product Designer & Full-Stack Developer",
    period: "May–August 2026",
    technologies: [
      "React",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "Tailwind CSS",
      "Airtable API",
      "SheetJS",
    ],
    summary:
      "Interactive, unified reporting portal for exploring fund performance, comparing quarterly results, and drilling down into 1,000+ underlying companies across 28 funds.",
    preview: {
      src: "/images/aldea-investor-portal.png",
      alt: "Aldea Investor Portal showing a company performance scatter plot and investment details using mock data",
      label: "Fund overview",
      caption: "Investor Portal - Portfolio Explorer (Synthetic Data)",
      aspectRatio: "2514 / 1660",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "Designed and built Aldea’s investor reporting portal as a sole developer reporting directly to Managing Partner Andrew Padilla. Shifting from conventional static quarterly report PDF's to an interactive interface for exploring fund performance and drill-down access to 1,000+ underlying companies across 28 portfolio funds.",
        links: [
          {
            text: "Andrew Padilla",
            href: "https://www.linkedin.com/in/andrewpadilla/",
          },
        ],
        bold: [
          "1,000+ underlying companies",
          "28 portfolio funds",
        ],
        visual: {
          src: "/images/aldea-investor-portal-intro.png",
          alt: "Aldea Investor Portal introduction",
          label: "Investor portal introduction",
          caption: "Aldea Tech Fund I - Overview (synthetic data)",
          aspectRatio: "2494 / 1614",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Conventional quarterly report PDFs were static, typically limiting each portfolio fund to a single page with only a few KPIs and its top-performing companies. This left much of the available portfolio data unexplored, and offered limited quarter to quarter comparisons.",
        visual: [
          {
            src: "/images/aldea-investor-portal-detailed-report.png",
            alt: "Static detailed investor report for a fictional fund, showing fund metrics, distributions, and portfolio-company data",
            label: "Detailed report",
            caption: "Detailed Portfolio Report - Info for one fund (synthetic data)",
            aspectRatio: "2048 / 1446",
          },
          {
            src: "/images/aldea-investor-portal-fund-level-report.png",
            alt: "Static fund-level investor report with fictional performance figures and portfolio totals",
            label: "Fund-level report",
            caption: "Fund-level report - Portfolio details (synthetic data)",
            aspectRatio: "2048 / 1446",
          },
        ],
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "The portal needed to consolidate confidential reporting data across 28 funds and 1,000+ underlying companies from multiple sources, including Excel, Airtable, and Attio. Also had to preserve consistent relationships across funds, quarters, and companies while restricting access to authorized internal users.",
        bold: ["28 funds and 1,000+ underlying companies"],
        visual: {
          src: "/images/investor-portal-context.png",
          alt: "Mock investor portal portfolio explorer with fund rows and an expanded fund dashboard showing identity, metrics, and a performance chart, using synthetic data",
          label: "Portfolio Explorer",
          caption: "Investor portal  -  Portfolio Explorer (synthetic data)",
          aspectRatio: "2714 / 1660",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "Built a deterministic pipeline that parsed Excel workbooks with SheetJS, enriched records through Airtable and Attio, and normalized the data into a shared reporting package. React and TypeScript powered the interface, with Supabase handling authentication, storage, server-side processing, and publication.",
        visual: {
          src: "/images/investor-portal-data-flow.png",
          alt: "Data pipeline from Excel, Airtable, and Attio through parsing and Supabase PostgreSQL to the portal and quarterly reports",
          label: "Data flow",
          caption: "Data architecture diagram",
          aspectRatio: "1122 / 1402",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "Delivered an operational internal portal supporting quarter-to-quarter comparisons, portfolio-fund analysis, exposure views, and drill-downs into all individual underlying funds and companies. The same normalized dataset also powered repeatable quarterly-report generation, bringing interactive exploration and recurring reporting into one connected system.",
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
      loomUrl: "https://www.loom.com/share/b9fb0c887144444d9542c403c1392009",
      demoPoster: null,
      walkthroughPoster: {
        src: "/images/aldea-investor-portal-walkthrough.png",
        alt: "Aldea Investor Portal preview showing fund performance indicators and quarterly reporting",
        label: "Portal walkthrough",
        caption: "Aldea Investor Portal - Product walkthrough",
        aspectRatio: "1242 / 777",
      },
    },
  },
  {
    slug: "aldea-investor-simulation",
    number: "02",
    title: "Aldea Investor Simulation",
    group: "Aldea Ventures",
    accent: "blue",
    discipline: "Investment modeling | Development",
    role: "Product Designer & Full-Stack Developer",
    period: "May–August 2026",
    technologies: ["React", "TypeScript", "Tailwind CSS", "SVG", "Vitest"],
    summary:
      "Simulation tool that allows investors to adjust TVPI assumptions and model exit scenarios to assess their impact on fund valuations, portfolio holdings, investor distributions, and the projected J-curve.",
    preview: {
      src: "/images/aldea-investor-simulation-bottom-trimmed.png",
      alt: "Aldea Investor Simulation for Tech Fund I, with a fund write-off scenario, performance metrics, and a projected J-curve",
      label: "Projected J-curve",
      caption: "Investor Portal - Simulation Mode",
      aspectRatio: "1120 / 766",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "Interactive financial simulation tool, allowing users to model how changes in investment valuations and potential write-offs affect overall fund performance. Combining scenario analysis with visual projections of returns and the fund's projected J-curve.",
        visual: {
          src: "/images/aldea-investor-simulation-intro.png",
          alt: "Aldea Investor Simulation introduction screen",
          label: "Exit assumptions",
          caption: "Aldea Tech Fund I Simulation Portal (Synthetic Data)",
          aspectRatio: "2940 / 1662",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Traditional fund reports show performance metrics but offer limited insight into how individual investments influence future outcomes. Aldea needed a way to explore alternative scenarios and understand how changes in portfolio valuations or write-offs could affect fund-level returns.",
        visual: {
          src: "/images/aldea-investor-simulation-problem.png",
          alt: "Aldea Investor Simulation problem section",
          label: "Holdings & distributions",
          caption: "Simulation Portal - Position Sensitivity & Vintage Stacking (Synthetic Data)",
          aspectRatio: "2940 / 1666",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "The main challenge was building financial modeling functions that translate changing valuations, cash flows, and performance metrics into fund-level projections across future quarters. Equally important was keeping hypothetical scenarios separate from actual portfolio data while designing for them to be saved and shared with other users.",
        visual: {
          src: "/images/aldea-investor-simulation-constraints.png",
          alt: "Aldea Investor Simulation context and constraints section",
          label: "Scenario assumptions",
          caption: "Simulation Portal - Annual Net Cashflows (Synthetic Data)",
          aspectRatio: "2940 / 1662",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "I built the calculation engine using TypeScript functions that process position-level valuation adjustments, aggregate commitment-weighted returns, and recalculate TVPI and estimated IRR using financial modeling assumptions for fees and carried interest. Implemented projection logic that preserves historical cash flows while adjusting future NAV and cash-flow estimates to model the J-curve, connecting these calculations to React state and SVG visualizations for scenario comparisons.",
        visual: {
          src: "/images/aldea-investor-simulation-process.png",
          alt: "Aldea Investor Simulation process section",
          label: "Projected J-curve",
          caption: "Simulation Portal - Fund Cumulative View (predicted + simulated, Synthetic Data)",
          aspectRatio: "2940 / 1664",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "Delivered a functional scenario-analysis tool that enables immediate comparisons between baseline projections and alternative investment outcomes. Users can explore portfolio sensitivities and visualize how individual positions influence modeled fund performance.",
        visual: {
          src: "/images/aldea-investor-simulation-outcome.png",
          alt: "Aldea Investor Simulation outcome section",
          label: "Scenario output",
          caption:
            "Simulation Portal - Interactive Fund Position Ladder (Synthetic Data)",
          aspectRatio: "2940 / 1664",
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
    discipline: "Platform Development | Investment Intelligence",
    role: "Platform development and data reconciliation",
    period: "May–August 2026",
    technologies: null,
    summary:
      "Internal investment intelligence platform that consolidates, organizes, and connects company data from multiple sources to support investment research, analysis, and tracking.",
    preview: {
      src: "/images/aldea-helios.png",
      alt: "Aldea Helios company intelligence dashboard showing agent activity and a network of company signals",
      label: "Company intelligence",
      caption: "Aldea Helios - Home",
      aspectRatio: "1320 / 922",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "Helios is Aldea's internal investment intelligence platform, consolidating information on companies, funds, managers, and investment opportunities into a unified research environment. It combines structured data, automated intelligence gathering, and AI-assisted analysis to support investment research and monitoring by giving each company a Conviction Score",
        links: [
          {
            text: "Andrew Padilla",
            href: "https://www.linkedin.com/in/andrewpadilla/",
          },
        ],
        visual: {
          src: "/images/helios-intro.png",
          alt: "Helios analyst network showing evidence events and the wider market flow",
          label: "Company intelligence view",
          caption: "AI Agent Analyst Network",
          aspectRatio: "2386 / 1206",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Through its fund-of-funds and Tech Fund II, Aldea built a powerful network across Europe spanning thousands of companies, and thus gaining access to a constant flow of reports, newsletters, and firsthand information on them. The goal was turning this information into useful intelligence, allowing Aldea to track companies over time, connect insights from different sources, and identify promising investment opportunities before they become \"obvious\" to the wider market.",
        visual: {
          src: "/images/helios-problem.png",
          alt: "Helios Observatory intelligence web showing connected company records",
          label: "Company-record relationships",
          caption: "Investment Intelligence Network - ByFounders Centered (Synthetic Data)",
          aspectRatio: "2940 / 1662",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "The platform needed to consolidate intelligence from multiple sources while establishing a consistent, traceable process for evaluating the reliability and relevance of each piece of information. The main challenge was developing AI-driven conviction scoring that accounts for source credibility and recency, giving stronger and more recent evidence greater influence while preserving historical context without excessive storage or processing costs.",
        links: [
          {
            text: "Andrew Padilla",
            href: "https://www.linkedin.com/in/andrewpadilla/",
          },
        ],
        visual: {
          src: "/images/helios-context-constraints.png",
          alt: "Helios data network infographic connecting internal systems and external research sources",
          label: "Existing company view",
          caption: "Helios Data Integration Architecture",
          aspectRatio: "1536 / 1024",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "I contributed to the maintenance and improvement of the existing React, TypeScript, and Supabase platform, focusing on data reconciliation, entity matching, deduplication, and debugging. My work also involved monitoring system health, investigating data inconsistencies, and implementing targeted fixes and improvements.",
        visual: {
          src: "/images/helios-process.png",
          alt: "Helios Add Intelligence screen with options for capturing company research and records",
          label: "Platform contribution",
          caption: "Intelligence Intake & Classification",
          aspectRatio: "1012 / 877",
          objectPosition: "center top",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "Helios turns Aldea’s extensive network intelligence into structured company profiles, evidence-backed conviction scores, and continuous updates that track how each company evolves over time. By identifying changes in conviction and emerging signals, it helps the investment team prioritize research, monitor its network, and spot promising opportunities before they attract wider market attention.",
        visual: [
          {
            src: "/images/helios-outcome-1.png",
            alt: "Helios company overview with a research assessment and key facts",
            label: "Company overview",
            caption: "Company Intelligence Profile (Synthetic Data)",
            aspectRatio: "2938 / 1662",
          },
          {
            src: "/images/helios-outcome-2.png",
            alt: "Helios living brief with an evidence-linked company assessment",
            label: "Living brief",
            caption: "AI-Generated Investment Assessment (Synthetic Data)",
            aspectRatio: "2938 / 1662",
          },
        ],
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
    discipline: "Product design | Full-stack development",
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
      "An event-management MVP for nightclubs and even labels, bringing event setup, scheduling, lineups, budgets, guestlists, and ticketing into one product.",
    preview: {
      src: "/images/kuspace-portfolio-cropped.png",
      alt: "KUSPACE logo in white on a black background",
      label: "Event workspace",
      caption: "Event operations in one workspace.",
      aspectRatio: "5 / 3",
    },
    sections: [
      {
        id: "intro",
        title: "Intro",
        text: "KUSPACE is an event-management platform for nightclubs, event labels, and independent organizers, bringing event management and ticketing into one workspace. It also offers a consumer experience for discovering events, applying for access, and managing tickets.",
        visual: {
          src: "/images/kuspace-intro.png",
          alt: "KUSPACE event-management platform introduction screen",
          label: "Event workspace",
          caption: "A workspace for nightclubs and event organizers.",
          aspectRatio: "2940 / 1678",
        },
      },
      {
        id: "problem",
        title: "The problem",
        text: "Organizing nightlife events involves coordinating lineups, timetables, budgets, guestlists, and ticket sales, often across disconnected tools and workflows. KUSPACE aimed to bring these operations into one platform while simplifying how attendees discover events and manage their access.",
        visual: {
          src: "/images/kuspace-problem.png",
          alt: "KUSPACE project screen illustrating the event-management problem",
          label: "Scheduling & lineups",
          caption: "Coordinating event schedules and performers.",
          aspectRatio: "2938 / 1678",
        },
      },
      {
        id: "context",
        title: "Context & constraints",
        text: "Building a two-sided platform meant balancing a broad set of features with the scope of an achievable MVP. The main technical challenges involved modeling complex event relationships, keeping organization data and permissions isolated, and maintaining accurate ticket inventory and access records throughout the payment process.",
        visual: {
          src: "/images/kuspace-context-constraints.png",
          alt: "KUSPACE project screen illustrating its context and constraints",
          label: "Budgets & guestlists",
          caption: "Event information scoped to each organization.",
          aspectRatio: "2938 / 1678",
        },
      },
      {
        id: "process",
        title: "Process",
        text: "Independently designed and developed KUSPACE, building its UI/UX, Next.js and TypeScript frontend, PostgreSQL database with Prisma, and backend services using Zod-validated API routes. I also implemented Clerk authentication, organization-based access controls, and Stripe Checkout with webhook-driven order processing to manage payments, ticket inventory, and attendee access.",
        visual: {
          src: "/images/kuspace-process.png",
          alt: "KUSPACE project screen illustrating the development process",
          label: "Ticket checkout",
          caption: "The implemented ticket checkout flow.",
          aspectRatio: "1471 / 839",
        },
      },
      {
        id: "outcome",
        title: "Outcome",
        text: "KUSPACE brought fragmented event-management workflows into one unified platform, combining event planning, multi-room scheduling, budget tracking, guestlist management, ticket sales, and attendee reporting. It gave organizers a single workspace to manage everything from financial operations to ticket distribution and guest access, while providing attendees with event discovery and digital tickets with QR-code displays.",
        visual: [
          {
            src: "/images/kuspace-outcome-1.png",
            alt: "KUSPACE event-management MVP interface",
            label: "Event-management MVP",
            caption: "Event operations and ticketing in a single application.",
            aspectRatio: "2938 / 1678",
          },
          {
            src: "/images/kuspace-outcome-2.png",
            alt: "KUSPACE event-management MVP interface, second view",
            label: "Event-management MVP, second view",
            caption: "Event operations and ticketing in a single application.",
            aspectRatio: "1471 / 839",
          },
        ],
      },
    ],
    media: {
      demoUrl: "https://kuspace.vercel.app/",
      repositoryUrl: "https://github.com/miguelrodes/kuspace-platform",
      loomUrl: null,
      demoPoster: null,
      walkthroughPoster: null,
    },
  },
];
