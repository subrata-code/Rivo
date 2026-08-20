export default function FrameOverlay() {
  const navLinks = ["Work", "Studio", "Contact"];

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <a
        href="/"
        aria-label="Rivo home"
        className="pointer-events-auto absolute left-6 top-7 flex items-center gap-2.5 md:left-10 md:top-9"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          className="text-white/90"
        >
          <path
            d="M3 15V3h4.5l3 9 3-9H15v12"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.32em] text-white/90">
          Rivo
        </span>
      </a>

      <nav
        aria-label="Primary"
        className="pointer-events-auto absolute right-6 top-7 flex items-center gap-7 md:right-10 md:top-9 md:gap-9"
      >
        {navLinks.map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-white/45 transition-colors duration-300 hover:text-white/90"
          >
            {link}
          </a>
        ))}
      </nav>

      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center md:bottom-10"
      >
        <div className="relative h-10 w-px overflow-hidden bg-white/15">
          <div className="animate-scroll-indicator absolute left-0 h-3 w-full bg-white/75" />
        </div>
      </div>
    </div>
  );
}
