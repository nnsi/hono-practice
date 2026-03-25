export function ActikoLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 190"
      className={className}
      aria-label="Actiko"
      role="img"
    >
      <defs>
        <clipPath id="a-clip">
          <rect x="0" y="0" width="460" height="127" />
          <rect x="0" y="145" width="460" height="45" />
        </clipPath>
      </defs>

      {/* A lettermark */}
      <g clipPath="url(#a-clip)">
        <polygon
          points="100,10 48,178 66,178 100,70 134,178 152,178"
          fill="rgb(217,119,6)"
          opacity="0.12"
          transform="translate(-9, 0)"
        />
        <polygon
          points="100,10 48,178 66,178 100,70 134,178 152,178"
          fill="rgb(217,119,6)"
          opacity="0.25"
          transform="translate(-4.5, 0)"
        />
        <polygon points="100,10 48,178 66,178 100,70" fill="rgb(217,119,6)" />
        <polygon points="100,10 134,178 152,178 100,70" fill="rgb(217,119,6)" />
      </g>

      {/* Pulse line */}
      <polyline
        points="18,136 46,136 78,136 86,116 94,146 102,110 110,140 116,126 142,136 392,136 400,116 408,146 416,110 424,140 430,126 450,136"
        fill="none"
        stroke="rgb(217,119,6)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="18,136 46,136 78,136 86,116 94,146 102,110 110,140 116,126 142,136 392,136 400,116 408,146 416,110 424,140 430,126 450,136"
        fill="none"
        stroke="rgb(217,119,6)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.15"
      />
      <circle cx="102" cy="110" r="2" fill="rgb(217,119,6)" />
      <circle cx="102" cy="110" r="4" fill="rgb(217,119,6)" opacity="0.25" />
      <circle cx="416" cy="110" r="2" fill="rgb(217,119,6)" />
      <circle cx="416" cy="110" r="4" fill="rgb(217,119,6)" opacity="0.25" />

      {/* ctiko motion trails */}
      <g opacity="0.12" transform="translate(-9, 0)" fill="rgb(217,119,6)">
        <rect x="160" y="54" width="16" height="80" />
        <rect x="160" y="54" width="44" height="16" />
        <rect x="160" y="118" width="44" height="16" />
        <rect x="224" y="30" width="16" height="104" />
        <rect x="212" y="54" width="36" height="16" />
        <rect x="256" y="54" width="16" height="80" />
        <rect x="256" y="28" width="16" height="16" />
        <rect x="282" y="54" width="16" height="80" />
        <polygon points="298,86 298,102 328,68 328,54" />
        <polygon points="298,86 298,102 328,118 328,134" />
        <path
          d="M338,54 h48 v80 h-48 z M354,70 h16 v48 h-16 z"
          fillRule="evenodd"
        />
      </g>
      <g opacity="0.25" transform="translate(-4.5, 0)" fill="rgb(217,119,6)">
        <rect x="160" y="54" width="16" height="80" />
        <rect x="160" y="54" width="44" height="16" />
        <rect x="160" y="118" width="44" height="16" />
        <rect x="224" y="30" width="16" height="104" />
        <rect x="212" y="54" width="36" height="16" />
        <rect x="256" y="54" width="16" height="80" />
        <rect x="256" y="28" width="16" height="16" />
        <rect x="282" y="54" width="16" height="80" />
        <polygon points="298,86 298,102 328,68 328,54" />
        <polygon points="298,86 298,102 328,118 328,134" />
        <path
          d="M338,54 h48 v80 h-48 z M354,70 h16 v48 h-16 z"
          fillRule="evenodd"
        />
      </g>

      {/* ctiko main */}
      <g fill="rgb(217,119,6)">
        <rect x="160" y="54" width="16" height="80" />
        <rect x="160" y="54" width="44" height="16" />
        <rect x="160" y="118" width="44" height="16" />
        <rect x="224" y="30" width="16" height="104" />
        <rect x="212" y="54" width="36" height="16" />
        <rect x="256" y="54" width="16" height="80" />
        <rect x="256" y="28" width="16" height="16" />
        <rect x="282" y="54" width="16" height="80" />
        <polygon points="298,86 298,102 328,68 328,54" />
        <polygon points="298,86 298,102 328,118 328,134" />
        <path
          d="M338,54 h48 v80 h-48 z M354,70 h16 v48 h-16 z"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}
