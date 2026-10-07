import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { profile, projects } from "./content";
import type { Project, Visual } from "./content";
import "./App.css";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <Arrow diagonal />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Header({ isHome }: { isHome: boolean }) {
  return (
    <header className="site-header shell">
      <a className="wordmark" href="/" aria-label="Miguel Rodés Knuth — home">
        mrk<span>.</span>
      </a>
      <span className="header-note eyebrow">Selected portfolio · 2026</span>
      <nav aria-label="Main navigation">
        <a href={isHome ? "#profile" : "/#profile"}>Profile</a>
        <a href={isHome ? "#contact" : "/#contact"}>Contact</a>
        <a href={isHome ? "#work" : "/#work"}>
          Work <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer shell">
      <div>
        <a className="footer-name" href="/">
          {profile.name}
        </a>
        <p>{profile.descriptor}</p>
      </div>
      <div className="footer-links">
        <a href={`mailto:${profile.email}`}>
          Email <Arrow diagonal />
        </a>
        <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
        <ExternalLink href={profile.github}>GitHub</ExternalLink>
      </div>
      <span className="footer-location">
        {profile.location} <span aria-hidden="true">↗</span>
      </span>
    </footer>
  );
}

function MediaFrame({
  visual,
  variant = "",
  number,
  showCaption = true,
  eager = false,
}: {
  visual: Visual;
  variant?: string;
  number?: string;
  showCaption?: boolean;
  eager?: boolean;
}) {
  return (
    <figure className={`media-figure ${variant}`}>
      <div
        className={`media-frame ${visual.src ? "has-image" : "is-placeholder"}`}
        style={{ aspectRatio: visual.aspectRatio || "8 / 5" }}
      >
        {visual.src ? (
          <img
            src={visual.src}
            alt={visual.alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <>
            <span className="frame-corner top-left" aria-hidden="true" />
            <span className="frame-corner bottom-right" aria-hidden="true" />
            <div className="placeholder-center">
              <span className="placeholder-symbol" aria-hidden="true">
                <span />
                <span />
              </span>
              <span>{visual.label}</span>
              <span className="placeholder-note">
                {variant === "portrait"
                  ? "Portrait placeholder"
                  : "Image placeholder"}
              </span>
            </div>
            <span className="frame-index eyebrow" aria-hidden="true">
              {number || "01"} /{" "}
              {variant === "portrait" ? "Profile" : "Selected view"}
            </span>
          </>
        )}
      </div>
      {showCaption && <figcaption>{visual.caption}</figcaption>}
    </figure>
  );
}

function ScrollGuide() {
  const guide = useRef<HTMLDivElement>(null);
  const position = useRef<HTMLSpanElement>(null);
  const [marks, setMarks] = useState<number[]>([]);
  useEffect(() => {
    const sections = [
      ...document.querySelectorAll<HTMLElement>("[data-guide]"),
    ];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let points: number[] = [];
    const update = () => {
      frame = 0;
      const first = points[0] ?? 0;
      const last = points.at(-1) ?? first;
      const current = window.scrollY + window.innerHeight * 0.3;
      const progress = Math.min(
        1,
        Math.max(0, (current - first) / Math.max(1, last - first)),
      );
      const index = points.reduce(
        (active, point, i) => (current >= point ? i : active),
        0,
      );
      const height = Math.max(0, (guide.current?.clientHeight ?? 0) - 32);
      const discreteProgress =
        ((points[index] ?? first) - first) / Math.max(1, last - first);
      guide.current?.style.setProperty(
        "--guide-offset",
        `${(reducedMotion.matches ? discreteProgress : progress) * height}px`,
      );
      if (position.current)
        position.current.textContent = String(index + 1).padStart(2, "0");
    };
    const measure = () => {
      points = sections.map(
        (section) => section.getBoundingClientRect().top + window.scrollY,
      );
      const range = Math.max(1, (points.at(-1) ?? 0) - (points[0] ?? 0));
      setMarks(
        points.map((point) => ((point - (points[0] ?? 0)) / range) * 100),
      );
      update();
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    reducedMotion.addEventListener("change", update);
    measure();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);
  return (
    <aside className="scroll-guide" aria-hidden="true">
      <span className="guide-label">Scroll</span>
      <div className="guide-track" ref={guide}>
        {marks.map((mark, i) => (
          <i className="guide-tick" key={i} style={{ top: `${mark}%` }} />
        ))}
        <span className="guide-segment" />
      </div>
      <span className="guide-position" ref={position}>
        01
      </span>
    </aside>
  );
}

function HomePage() {
  const [firstName, ...familyNames] = profile.name.split(" ");
  return (
    <>
      <section className="profile-section" id="profile" data-guide>
        <div className="profile-copy">
          <p className="eyebrow profile-kicker">
            <span className="small-square" /> A little about me
          </p>
          <h1>
            {firstName}
            <br />
            {familyNames.join(" ")}
            <span className="name-period">.</span>
          </h1>
          <p className="descriptor">{profile.descriptor}</p>
          <p className="academic-statement">{profile.academicStatement}</p>
          <p className="bio">{profile.bio}</p>
        </div>
        <div className="portrait-column">
          <div className="portrait-topline eyebrow">
            <span>01 / Profile</span>
            <span>{profile.location}</span>
          </div>
          <MediaFrame visual={profile.portrait} variant="portrait" eager />
          <div className="portrait-footnote">
            <span className="small-square orange" /> Available for co-op ·{" "}
            {profile.availability}
          </div>
        </div>
      </section>
      {profile.banner.enabled && (
        <MediaFrame visual={profile.banner.visual} variant="profile-banner" />
      )}
      <section
        className="contact-strip"
        id="contact"
        aria-label="Contact and links"
      >
        <div className="contact-intro">
          <span className="eyebrow">Let’s connect</span>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </div>
        <div className="contact-actions">
          <div className="primary-actions">
            <a href="#work">
              Review work <Arrow />
            </a>
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View résumé <Arrow diagonal />
              <span className="sr-only"> (PDF, opens in a new tab)</span>
            </a>
            <a href={`mailto:${profile.email}`}>
              Contact <Arrow diagonal />
            </a>
          </div>
          <div className="secondary-actions">
            <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
            <ExternalLink href={profile.github}>GitHub</ExternalLink>
          </div>
        </div>
      </section>
      <section
        className="work-section"
        id="work"
        data-guide
        aria-labelledby="work-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">From idea to implementation</p>
            <h2 id="work-title">
              Selected work<span className="work-count">(04)</span>
            </h2>
          </div>
          <span className="work-years">2025 — 2026</span>
        </div>
        {(["Aldea Ventures", "Independent work"] as const).map((group) => (
          <div
            className={`project-group ${group === "Independent work" ? "accent-orange" : ""}`}
            key={group}
          >
            <div className="group-heading">
              <h3>{group}</h3>
              <span className="eyebrow">
                {group === "Aldea Ventures"
                  ? "Investment technology / 3 projects"
                  : "Product & development / 1 project"}
              </span>
            </div>
            {projects
              .filter((project) => project.group === group)
              .map((project) => (
                <article
                  className={`project-row accent-${project.accent}`}
                  key={project.slug}
                  data-guide
                >
                  <a
                    className="project-preview"
                    href={`/work/${project.slug}`}
                    aria-label={`View ${project.title} case study`}
                  >
                    <MediaFrame
                      visual={project.preview}
                      number={project.number}
                      showCaption={false}
                    />
                  </a>
                  <div className="project-copy">
                    <div className="project-eyebrow eyebrow">
                      <span>{project.number}</span>
                      <span>{project.discipline}</span>
                    </div>
                    <h4>
                      <a href={`/work/${project.slug}`}>{project.title}</a>
                    </h4>
                    <p>{project.summary}</p>
                    <span className="project-period">{project.period}</span>
                    <a
                      className="text-link project-link"
                      href={`/work/${project.slug}`}
                    >
                      View project <Arrow />
                      <span className="sr-only">: {project.title}</span>
                    </a>
                  </div>
                </article>
              ))}
          </div>
        ))}
      </section>
    </>
  );
}

function MediaActions({ project }: { project: Project }) {
  const { media } = project;
  if (project.slug !== "aldea-investor-portal" && project.slug !== "kuspace")
    return null;
  return (
    <div className="media-actions">
      <div className="demo-module">
        {media.demoPoster && (
          <MediaFrame
            visual={media.demoPoster}
            variant="demo-poster"
            showCaption={false}
          />
        )}
        <div className="demo-description">
          <p className="module-title">
            {project.slug === "aldea-investor-portal"
              ? "Test the portal"
              : "Explore KUSPACE"}
          </p>
          <p>
            {project.slug === "aldea-investor-portal"
              ? "Explore the reporting interface using sample data"
              : "An event workspace, from planning to ticketing."}
          </p>
          {media.demoUrl ? (
            <>
              <ExternalLink className="text-link" href={media.demoUrl}>
                {project.slug === "aldea-investor-portal"
                  ? "Test the portal"
                  : "View demo"}
              </ExternalLink>
              {project.slug === "aldea-investor-portal" && (
                <span className="media-status">Demo with synthetic data</span>
              )}
            </>
          ) : (
            <span className="media-status">Interactive demo coming soon</span>
          )}
          {project.slug === "kuspace" &&
            (media.repositoryUrl ? (
              <ExternalLink className="text-link" href={media.repositoryUrl}>
                Public repository
              </ExternalLink>
            ) : (
              <span className="media-status">
                Public repository coming soon
              </span>
            ))}
        </div>
      </div>
      <div className="walkthrough-module">
        {media.walkthroughPoster && (
          <MediaFrame
            visual={media.walkthroughPoster}
            variant="walkthrough-poster"
            showCaption={false}
          />
        )}
        <div>
          {media.loomUrl ? (
            <ExternalLink className="text-link" href={media.loomUrl}>
              Watch walkthrough
            </ExternalLink>
          ) : (
            <span className="media-status">Walkthrough coming soon</span>
          )}
          <span className="walkthrough-caption">
            {media.walkthroughPoster?.caption}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectPage({ project }: { project: Project }) {
  const nextProject =
    projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <div className={`case-study accent-${project.accent}`}>
      <header className="case-header">
        <a className="back-link" href="/#work">
          <span aria-hidden="true">←</span> Selected work
        </a>
        <p className="eyebrow case-kicker">
          {project.group} <span>/</span> Project {project.number}
        </p>
        <h1>{project.title}</h1>
        <div className="case-metadata">
          <div>
            <span className="eyebrow">Role</span>
            <p>{project.role}</p>
          </div>
          <div>
            <span className="eyebrow">Period</span>
            <p>{project.period}</p>
          </div>
          {project.technologies && (
            <div className="technology-meta">
              <span className="eyebrow">Built with</span>
              <p>{project.technologies.join(" · ")}</p>
            </div>
          )}
        </div>
      </header>
      <nav className="case-contents" aria-label="Case study sections">
        {project.sections.map((section, index) => (
          <a key={section.id} href={`#${section.id}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </a>
        ))}
      </nav>
      <div className="case-sections">
        {project.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="case-section"
            data-guide
            aria-labelledby={`${section.id}-title`}
          >
            <div className="case-section-copy">
              <span className="eyebrow section-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              <p>{section.text}</p>
            </div>
            <MediaFrame
              visual={section.visual}
              number={String(index + 1).padStart(2, "0")}
            />
            {section.id === "outcome" && <MediaActions project={project} />}
          </section>
        ))}
      </div>
      <nav className="case-bottom-nav" aria-label="More projects">
        <a href="/#work" className="text-link">
          <span aria-hidden="true">←</span> All selected work
        </a>
        <a className="next-project" href={`/work/${nextProject.slug}`}>
          <span className="eyebrow">Next project</span>
          <span>
            {nextProject.title} <Arrow />
          </span>
        </a>
      </nav>
    </div>
  );
}

function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Page not found</p>
      <h1>A small detour.</h1>
      <p>
        This page isn’t here. You can find my projects back at selected work.
      </p>
      <a className="text-link" href="/#work">
        Return to selected work <Arrow />
      </a>
    </section>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const project = projects.find((item) => path === `/work/${item.slug}`);
  const isHome = path === "/";
  useEffect(() => {
    document.title = project
      ? `${project.title} — ${profile.name}`
      : isHome
        ? `${profile.name} — Product Design & Full-Stack Development`
        : `Page not found — ${profile.name}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", project?.summary ?? profile.bio);
    if (window.location.hash)
      requestAnimationFrame(() =>
        document
          .getElementById(window.location.hash.slice(1))
          ?.scrollIntoView(),
      );
  }, [project, isHome]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header isHome={isHome} />
      {(isHome || project) && <ScrollGuide />}
      <main className="shell" id="main">
        {isHome ? (
          <HomePage />
        ) : project ? (
          <ProjectPage project={project} />
        ) : (
          <NotFound />
        )}
      </main>
      <Footer />
    </>
  );
}
