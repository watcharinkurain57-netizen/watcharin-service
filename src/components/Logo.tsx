type LogoMarkProps = {
  className?: string;
  /** Unique suffix so multiple instances on a page don't share a gradient id. */
  idSuffix?: string;
};

/**
 * "Connected Nodes" mark — five nodes wired into a W, evoking the connected
 * ecosystem. Gradient-filled for use on light backgrounds (nav, footer).
 */
export function LogoMark({ className, idSuffix = "" }: LogoMarkProps) {
  const gid = `logoGrad${idSuffix}`;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="Watcharin Service"
    >
      <defs>
        <linearGradient
          id={gid}
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path
        d="M24 32 L38 70 L50 46 L62 70 L76 32"
        stroke={`url(#${gid})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx="24" cy="32" r="7" fill={`url(#${gid})`} />
      <circle cx="38" cy="70" r="7" fill={`url(#${gid})`} />
      <circle cx="50" cy="46" r="7" fill={`url(#${gid})`} />
      <circle cx="62" cy="70" r="7" fill={`url(#${gid})`} />
      <circle cx="76" cy="32" r="7" fill={`url(#${gid})`} />
    </svg>
  );
}
