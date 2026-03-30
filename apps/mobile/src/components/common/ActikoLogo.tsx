import {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Polygon,
  Polyline,
  Rect,
  Svg,
} from "react-native-svg";

type Props = {
  width?: number;
  height?: number;
};

export function ActikoLogo({ width = 230, height = 95 }: Props) {
  return (
    <Svg
      viewBox="0 0 460 190"
      width={width}
      height={height}
      accessibilityLabel="Actiko"
      accessibilityRole="image"
    >
      <Defs>
        <ClipPath id="a-clip">
          <Rect x="0" y="0" width="460" height="127" />
          <Rect x="0" y="145" width="460" height="45" />
        </ClipPath>
      </Defs>

      {/* A lettermark */}
      <G clipPath="url(#a-clip)">
        <Polygon
          points="100,10 48,178 66,178 100,70 134,178 152,178"
          fill="rgb(217,119,6)"
          opacity="0.12"
          transform="translate(-9, 0)"
        />
        <Polygon
          points="100,10 48,178 66,178 100,70 134,178 152,178"
          fill="rgb(217,119,6)"
          opacity="0.25"
          transform="translate(-4.5, 0)"
        />
        <Polygon points="100,10 48,178 66,178 100,70" fill="rgb(217,119,6)" />
        <Polygon points="100,10 134,178 152,178 100,70" fill="rgb(217,119,6)" />
      </G>

      {/* Pulse line */}
      <Polyline
        points="18,136 46,136 78,136 86,116 94,146 102,110 110,140 116,126 142,136 392,136 400,116 408,146 416,110 424,140 430,126 450,136"
        fill="none"
        stroke="rgb(217,119,6)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="18,136 46,136 78,136 86,116 94,146 102,110 110,140 116,126 142,136 392,136 400,116 408,146 416,110 424,140 430,126 450,136"
        fill="none"
        stroke="rgb(217,119,6)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.15"
      />
      <Circle cx="102" cy="110" r="2" fill="rgb(217,119,6)" />
      <Circle cx="102" cy="110" r="4" fill="rgb(217,119,6)" opacity="0.25" />
      <Circle cx="416" cy="110" r="2" fill="rgb(217,119,6)" />
      <Circle cx="416" cy="110" r="4" fill="rgb(217,119,6)" opacity="0.25" />

      {/* ctiko motion trails */}
      <G opacity="0.12" transform="translate(-9, 0)" fill="rgb(217,119,6)">
        <Rect x="160" y="54" width="16" height="80" />
        <Rect x="160" y="54" width="44" height="16" />
        <Rect x="160" y="118" width="44" height="16" />
        <Rect x="224" y="30" width="16" height="104" />
        <Rect x="212" y="54" width="36" height="16" />
        <Rect x="256" y="54" width="16" height="80" />
        <Rect x="256" y="28" width="16" height="16" />
        <Rect x="282" y="54" width="16" height="80" />
        <Polygon points="298,86 298,102 328,68 328,54" />
        <Polygon points="298,86 298,102 328,118 328,134" />
        <Path
          d="M338,54 h48 v80 h-48 z M354,70 h16 v48 h-16 z"
          fillRule="evenodd"
        />
      </G>
      <G opacity="0.25" transform="translate(-4.5, 0)" fill="rgb(217,119,6)">
        <Rect x="160" y="54" width="16" height="80" />
        <Rect x="160" y="54" width="44" height="16" />
        <Rect x="160" y="118" width="44" height="16" />
        <Rect x="224" y="30" width="16" height="104" />
        <Rect x="212" y="54" width="36" height="16" />
        <Rect x="256" y="54" width="16" height="80" />
        <Rect x="256" y="28" width="16" height="16" />
        <Rect x="282" y="54" width="16" height="80" />
        <Polygon points="298,86 298,102 328,68 328,54" />
        <Polygon points="298,86 298,102 328,118 328,134" />
        <Path
          d="M338,54 h48 v80 h-48 z M354,70 h16 v48 h-16 z"
          fillRule="evenodd"
        />
      </G>

      {/* ctiko main */}
      <G fill="rgb(217,119,6)">
        <Rect x="160" y="54" width="16" height="80" />
        <Rect x="160" y="54" width="44" height="16" />
        <Rect x="160" y="118" width="44" height="16" />
        <Rect x="224" y="30" width="16" height="104" />
        <Rect x="212" y="54" width="36" height="16" />
        <Rect x="256" y="54" width="16" height="80" />
        <Rect x="256" y="28" width="16" height="16" />
        <Rect x="282" y="54" width="16" height="80" />
        <Polygon points="298,86 298,102 328,68 328,54" />
        <Polygon points="298,86 298,102 328,118 328,134" />
        <Path
          d="M338,54 h48 v80 h-48 z M354,70 h16 v48 h-16 z"
          fillRule="evenodd"
        />
      </G>
    </Svg>
  );
}
