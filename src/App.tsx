import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { profile, projects } from "./content";
import type { Project, ProjectSection, Visual } from "./content";
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

function Header({ isHome, isContact }: { isHome: boolean; isContact: boolean }) {
  return (
    <header className="site-header shell">
      <a className="wordmark" href="/" aria-label="Miguel Rodés Knuth — home">
        {profile.name}
      </a>
      <nav aria-label="Main navigation">
        <a href={isHome ? "#work" : "/#work"}>Portfolio</a>
        <a href="/contact" aria-current={isContact ? "page" : undefined}>Contact</a>
        <a href={profile.resumeUrl} download={profile.resumeFilename}>
          Resume<span className="sr-only"> (PDF download)</span>
        </a>
      </nav>
    </header>
  );
}

function Footer({ isHome }: { isHome: boolean }) {
  return (
    <footer className={`site-footer shell${isHome ? " site-footer-home" : ""}`}>
      <div>
        <a className="footer-name" href="/">
          {profile.name}
        </a>
        <p>{profile.descriptor}</p>
      </div>
      <div className="footer-links">
        {isHome && (
          <a className="footer-resume" href={profile.resumeUrl} download={profile.resumeFilename}>
            Resume
          </a>
        )}
        <a href={`mailto:${profile.email}`}>
          Email <Arrow diagonal />
        </a>
        <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
        <ExternalLink href={profile.github}>GitHub</ExternalLink>
      </div>
      {!isHome && (
        <span className="footer-location">
          {profile.location} <span aria-hidden="true">↗</span>
        </span>
      )}
    </footer>
  );
}

function ImageLightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption: string;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="image-lightbox"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="image-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={caption || alt || "Enlarged image"}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButton}
          className="image-lightbox-close"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close enlarged image"
        >
          <span aria-hidden="true">×</span>
        </button>
        <img className="image-lightbox-image" src={src} alt={alt} />
        {caption && <p className="image-lightbox-caption">{caption}</p>}
      </div>
    </div>,
    document.body,
  );
}

function MediaFrame({
  visual,
  variant = "",
  number,
  showCaption = true,
  showCorners = true,
  eager = false,
}: {
  visual: Visual;
  variant?: string;
  number?: string;
  showCaption?: boolean;
  showCorners?: boolean;
  eager?: boolean;
}) {
  const [imageExpanded, setImageExpanded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeLightbox = useCallback(() => setImageExpanded(false), []);

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
            style={{ objectPosition: visual.objectPosition }}
            role="button"
            tabIndex={0}
            aria-label={`Open larger image: ${visual.alt || visual.label}`}
            aria-haspopup="dialog"
            ref={imageRef}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.focus({ preventScroll: true });
              setImageExpanded(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.focus({ preventScroll: true });
                setImageExpanded(true);
              }
            }}
          />
        ) : (
          <>
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
        {showCorners && variant !== "portrait" && variant !== "profile-banner" && (
          <>
            <span className="frame-corner top-left" aria-hidden="true" />
            <span className="frame-corner bottom-right" aria-hidden="true" />
          </>
        )}
      </div>
      {showCaption && <figcaption>{visual.caption}</figcaption>}
      {imageExpanded && visual.src && (
        <ImageLightbox
          src={visual.src}
          alt={visual.alt}
          caption={visual.caption}
          onClose={closeLightbox}
        />
      )}
    </figure>
  );
}

type ContentsEntry = { id: string; title: string; isSubsection?: boolean };

function TableOfContents({ entries }: { entries: ContentsEntry[] }) {
  const [activeId, setActiveId] = useState(entries[0]?.id);
  const [surface, setSurface] = useState("default");
  useEffect(() => {
    const sections = entries.flatMap((entry) => {
      const element = document.getElementById(entry.id);
      return element ? [{ id: entry.id, element }] : [];
    });
    const workGroups = Array.from(
      document.querySelectorAll<HTMLElement>("[data-work-theme]"),
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      const current = atBottom ? sections.at(-1) : sections.reduce(
        (active, section) => section.element.getBoundingClientRect().top <= 64
          ? section : active,
        sections[0],
      );
      if (current) setActiveId(current.id);
      const underlyingGroup = workGroups.find((group) => {
        const bounds = group.getBoundingClientRect();
        return bounds.top <= window.innerHeight / 2 && bounds.bottom > window.innerHeight / 2;
      });
      setSurface(underlyingGroup?.dataset.workTheme ?? "default");
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.body);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    update();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [entries]);
  return (
    <nav className="page-contents" data-surface={surface} aria-label="On this page">
      {entries.map((entry) => (
        <a
          key={entry.id}
          className={entry.isSubsection ? "contents-subsection" : undefined}
          href={`#${entry.id}`}
          aria-current={activeId === entry.id ? "location" : undefined}
        >
          <span className="contents-title">{entry.title}</span>
          <span className="contents-marker" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}

function ProjectPreview({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollFrame = useRef(0);
  const detailsId = `${project.slug}-details`;
  const titleId = `${project.slug}-title`;

  useEffect(() => () => window.cancelAnimationFrame(scrollFrame.current), []);

  const changeExpanded = (next: boolean) => {
    setExpanded(next);
    if (!next) toggleRef.current?.focus({ preventScroll: true });
    window.cancelAnimationFrame(scrollFrame.current);
    const alignProject = () => {
      const summary = summaryRef.current;
      const details = detailsRef.current;
      if (!summary || !details) return;
      const bounds = (next ? details : summary).getBoundingClientRect();
      const rowTransform = getComputedStyle(summary.parentElement!).transform;
      const entranceOffset = rowTransform === "none" ? 0 : new DOMMatrixReadOnly(rowTransform).m42;
      // Use the row's final position even if its scroll entrance is still running.
      const top = window.scrollY + bounds.top - entranceOffset + (next ? 0 :
        Math.max(0, bounds.height - window.innerHeight * 0.5) - 28);
      // The last project needs enough room to unfold before its scroll target exists.
      if (next && document.documentElement.scrollHeight - window.innerHeight < top &&
        details.getAnimations().some(animation => animation.playState === "running" || animation.pending)) {
        scrollFrame.current = window.requestAnimationFrame(alignProject);
        return;
      }
      if (next) closeRef.current?.focus({ preventScroll: true });
      window.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant" : "smooth",
      });
    };
    scrollFrame.current = window.requestAnimationFrame(alignProject);
  };

  return (
    <article
      className={`project-row accent-${project.accent}${projects.indexOf(project) % 2 === 1 ? " project-row-reversed" : ""}`}
      id={project.slug}
      data-expanded={expanded}
    >
      <div className="project-summary" ref={summaryRef}>
        <div className="project-preview">
          <MediaFrame
            visual={project.preview}
            number={project.number}
            showCaption={project.slug === "aldea-investor-portal"}
            showCorners={false}
          />
        </div>
        <div className="project-copy">
          <div className="project-eyebrow eyebrow">
            <span>{project.number}</span>
            <span>{project.discipline}</span>
          </div>
          <h4 id={titleId}>
            <button
              type="button"
              className="project-title-toggle"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => changeExpanded(!expanded)}
            >
              {project.title}
            </button>
          </h4>
          <p>{project.summary}</p>
          <span className="project-period">{project.period}</span>
          <button
            ref={toggleRef}
            type="button"
            className={`text-link project-link project-toggle${project.media.loomUrl ? " project-link-with-walkthrough" : ""}`}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => changeExpanded(!expanded)}
          >
            {expanded ? "Close project" : "View project"} <Arrow />
            <span className="sr-only">: {project.title}</span>
          </button>
          {project.slug === "kuspace" && (
            <span
              className="text-link project-demo-link"
              aria-disabled="true"
              title="Demo link will be added later"
            >
              Demo <Arrow diagonal />
            </span>
          )}
          {project.media.loomUrl && (
            <ExternalLink className="text-link project-walkthrough-link" href={project.media.loomUrl}>
              Video walkthrough
            </ExternalLink>
          )}
        </div>
      </div>
      <div
        ref={detailsRef}
        className="project-drilldown"
        id={detailsId}
        role="region"
        aria-labelledby={titleId}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="drilldown-clip">
          <div className="case-study case-study-inline">
            <div className="drilldown-heading">
              <span className="eyebrow">{project.number} / {project.title}</span>
              <button ref={closeRef} type="button" className="text-link drilldown-close" onClick={() => changeExpanded(false)}>
                Close project <span aria-hidden="true">↑</span>
              </button>
            </div>
            <div className="drilldown-body">
              <ProjectMetadata project={project} />
              <CaseSections project={project} inline />
              <button type="button" className="text-link drilldown-close drilldown-close-bottom" onClick={() => changeExpanded(false)}>
                Close project <span aria-hidden="true">↑</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function HomePage() {
  const [firstName, ...familyNames] = profile.name.split(" ");
  const [emailCopied, setEmailCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  useLayoutEffect(() => {
    const section = document.getElementById("work");
    if (!section || !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const groups = section.querySelectorAll<HTMLElement>(".project-group");
    const pendingGroups = new Set(groups);
    groups.forEach((group) => group.classList.add("work-surface-pending"));
    let surfaceFrame = 0;
    const revealSurfaces = () => {
      surfaceFrame = 0;
      pendingGroups.forEach((group) => {
        const bounds = group.getBoundingClientRect();
        if (bounds.top <= window.innerHeight * 0.78 && bounds.bottom > 0) {
          group.classList.remove("work-surface-pending");
          pendingGroups.delete(group);
        }
      });
    };
    const scheduleSurfaces = () => {
      if (!surfaceFrame) surfaceFrame = window.requestAnimationFrame(revealSurfaces);
    };
    const targets = section.querySelectorAll(
      ".section-heading, .group-heading, .project-row",
    );
    targets.forEach((target) => target.classList.add("work-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    window.addEventListener("scroll", scheduleSurfaces, { passive: true });
    window.addEventListener("resize", scheduleSurfaces);
    revealSurfaces();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleSurfaces);
      window.removeEventListener("resize", scheduleSurfaces);
      window.cancelAnimationFrame(surfaceFrame);
      groups.forEach((group) => group.classList.remove("work-surface-pending"));
      targets.forEach((target) => target.classList.remove("work-reveal", "is-visible"));
    };
  }, []);
  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setEmailCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setEmailCopied(false), 5000);
    } catch {
      setEmailCopied(false);
    }
  };
  return (
    <>
      <section
        className={`profile-section${profile.banner.enabled ? " has-banner" : ""}`}
        id="profile"
      >
        <div className="profile-copy">
          <div className="profile-heading">
            {profile.banner.enabled && (
              <MediaFrame
                visual={profile.banner.visual}
                variant="profile-banner"
                showCaption={false}
                eager
              />
            )}
            <h1>
              {firstName}
              <br />
              {familyNames.join(" ")}
            </h1>
          </div>
          <div className="profile-details">
            <div className="profile-role">
              <p className="descriptor">{profile.descriptor}</p>
              <span className="availability-tag">Availability: {profile.availability}</span>
            </div>
            <p className="academic-statement">{profile.academicStatement}</p>
            <p className="education-statement">{profile.educationStatement}</p>
            <p className="bio">{profile.bio}</p>
          </div>
        </div>
        <div className="portrait-column">
          <div className="portrait-topline eyebrow">
            <span>01 / Profile</span>
            <span>{profile.location}</span>
          </div>
          <MediaFrame visual={profile.portrait} variant="portrait" eager />
          <div className="portrait-links" id="contact" role="group" aria-label="Social and email links">
            <ExternalLink href={profile.github}>GitHub</ExternalLink>
            <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
            <button type="button" onClick={copyEmail}>
              <span aria-live="polite">{emailCopied ? "email copied" : "email"}</span>
              <Arrow diagonal />
            </button>
          </div>
        </div>
      </section>
      <section
        className="work-section"
        id="work"
        aria-labelledby="work-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="work-title">
              Selected work
            </h2>
          </div>
        </div>
        {(["Aldea Ventures", "Independent work"] as const).map((group) => (
          <div
            className="project-group"
            data-work-theme={group === "Independent work" ? "blue" : "burgundy"}
            key={group}
          >
            <div className="group-heading">
              <h3>{group}</h3>
              <span className="eyebrow">
                {group === "Aldea Ventures"
                  ? "Investment technology\u2003|\u2003May - August 2027"
                  : "Product & development / 1 project"}
              </span>
            </div>
            {projects
              .filter((project) => project.group === group)
              .map((project) => (
                <ProjectPreview key={project.slug} project={project} />
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

function ProjectMetadata({ project }: { project: Project }) {
  return (
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
  );
}

function renderSectionText(section: ProjectSection): ReactNode {
  let remaining = section.text;
  const parts: ReactNode[] = [];

  section.links?.forEach((link, index) => {
    const match = remaining.indexOf(link.text);
    if (match === -1) return;
    parts.push(remaining.slice(0, match));
    parts.push(
      <a key={`${link.text}-${index}`} href={link.href} target="_blank" rel="noopener noreferrer">
        {link.text}
      </a>,
    );
    remaining = remaining.slice(match + link.text.length);
  });

  parts.push(remaining);
  return parts;
}

function CaseSections({ project, inline = false }: { project: Project; inline?: boolean }) {
  const projectIndex = projects.indexOf(project);
  const pairStart = projectIndex % 2 === 0 ? 2 : 1;
  const Heading = inline ? "h5" : "h2";
  const renderSection = (index: number, paired = false) => {
    const section = project.sections[index];
    const id = inline ? `${project.slug}-${section.id}` : section.id;
    const imageFirst = paired || (index + projectIndex) % 2 === 1;
    const copy = (
      <div className="case-section-copy">
        <span className="eyebrow section-number">{String(index + 1).padStart(2, "0")}</span>
        <Heading id={`${id}-title`}>{section.title}</Heading>
        <p>{renderSectionText(section)}</p>
      </div>
    );
    const visual = (
      <MediaFrame visual={section.visual} number={String(index + 1).padStart(2, "0")} showCorners={false} />
    );
    return (
      <section
        key={section.id}
        id={id}
        className={`case-section${paired ? " case-section-paired" : ""}`}
        aria-labelledby={`${id}-title`}
      >
        {imageFirst ? visual : copy}
        {imageFirst ? copy : visual}
        {section.id === "outcome" && <MediaActions project={project} />}
      </section>
    );
  };

  return (
    <div className="case-sections">
      {project.sections.map((section, index) => {
        if (index === pairStart + 1) return null;
        if (index === pairStart) {
          return (
            <div className="case-image-pair" key={`${section.id}-pair`}>
              {renderSection(index, true)}
              {renderSection(index + 1, true)}
            </div>
          );
        }
        return renderSection(index);
      })}
    </div>
  );
}

function ProjectPage({ project }: { project: Project }) {
  const nextProject =
    projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <div className={`case-study accent-${project.accent}`}>
      <header className="case-header" id="overview">
        <a className="back-link" href="/#work">
          <span aria-hidden="true">←</span> Selected work
        </a>
        <p className="eyebrow case-kicker">
          {project.group} <span>/</span> Project {project.number}
        </p>
        <h1>{project.title}</h1>
        <ProjectMetadata project={project} />
      </header>
      <CaseSections project={project} />
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

function ContactPage() {
  return (
    <section className="connect-page" aria-labelledby="connect-title">
      <div className="connect-layout">
        <div className="connect-main">
          <p className="eyebrow connect-kicker">Contact</p>
          <h1 id="connect-title">Let’s connect</h1>
          <p className="connect-intro">
            I’d love to hear about opportunities in product management, design,
            and engineering, or ideas at the intersection of AI and Web3.
          </p>
          <a className="connect-email" href={`mailto:${profile.email}`}>
            <span className="eyebrow">Say hello</span>
            <span>{profile.email}<Arrow diagonal /></span>
          </a>
          <div className="connect-socials">
            <ExternalLink href={profile.linkedin} className="connect-social">
              <span>
                <span className="eyebrow">LinkedIn</span>
                <span className="connect-link-title">Professional background</span>
              </span>
            </ExternalLink>
            <ExternalLink href={profile.github} className="connect-social">
              <span>
                <span className="eyebrow">GitHub</span>
                <span className="connect-link-title">Code & projects</span>
              </span>
            </ExternalLink>
          </div>
          <a className="text-link connect-portfolio" href="/#work">
            Explore my portfolio <Arrow />
          </a>
        </div>
        <aside className="connect-details" aria-label="Availability and background">
          <p className="eyebrow">Availability</p>
          <p className="connect-availability">{profile.availability}</p>
          <dl>
            <div>
              <dt className="eyebrow">Based in</dt>
              <dd>{profile.location}</dd>
            </div>
            <div>
              <dt className="eyebrow">Focus</dt>
              <dd>Product management, design & engineering</dd>
            </div>
            <div>
              <dt className="eyebrow">Education</dt>
              <dd>Computer Science & Philosophy<br />Northeastern University</dd>
            </div>
          </dl>
          <a className="text-link" href={profile.resumeUrl} download={profile.resumeFilename}>
            Download résumé <span aria-hidden="true">↓</span>
            <span className="sr-only"> (PDF)</span>
          </a>
        </aside>
      </div>
    </section>
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
  const isContact = path === "/contact";
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (project) {
      root.dataset.projectTheme = project.group === "Aldea Ventures" ? "burgundy" : "blue";
    } else {
      delete root.dataset.projectTheme;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      getComputedStyle(root).getPropertyValue("--background").trim(),
    );
    return () => { delete root.dataset.projectTheme; };
  }, [project]);
  const contents = useMemo<ContentsEntry[]>(() => project ? [
    { id: "overview", title: "Overview" },
    ...project.sections.map(({ id, title }) => ({ id, title })),
  ] : [
    { id: "profile", title: "Profile" },
    { id: "contact", title: "Contact" },
    { id: "work", title: "Selected work" },
    ...projects.map(({ slug, title }) => ({
      id: slug,
      title: title.replace("Aldea Investor", "Investor"),
      isSubsection: true,
    })),
  ], [project]);
  useEffect(() => {
    document.title = project
      ? `${project.title} — ${profile.name}`
      : isHome
        ? `${profile.name} — Product Design & Full-Stack Development`
        : isContact
          ? `Contact — ${profile.name}`
          : `Page not found — ${profile.name}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        isContact
          ? `Connect with ${profile.name} about product management, design, and engineering opportunities. Availability: ${profile.availability}.`
          : project?.summary ?? profile.bio,
      );
    if (window.location.hash)
      requestAnimationFrame(() =>
        document
          .getElementById(window.location.hash.slice(1))
          ?.scrollIntoView(),
      );
    else if (isHome)
      requestAnimationFrame(() =>
        window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
      );
  }, [project, isHome, isContact]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header isHome={isHome} isContact={isContact} />
      {(isHome || project) && <TableOfContents entries={contents} />}
      <main className="shell" id="main">
        {isHome ? (
          <HomePage />
        ) : isContact ? (
          <ContactPage />
        ) : project ? (
          <ProjectPage project={project} />
        ) : (
          <NotFound />
        )}
      </main>
      <Footer isHome={isHome} />
    </>
  );
}
