import React from 'react';

interface HeroBackdropArtProps {
  compact?: boolean;
}

export const HeroBackdropArt: React.FC<HeroBackdropArtProps> = ({
  compact = false,
}) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Faceted geometric navy & cyan overlays */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 620"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <radialGradient id="heroGlowRight" cx="78%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#00C4F0" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#0D55B8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#060D3D" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="cyanDotMatrix"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="#18D9D2" fillOpacity="0.42" />
          </pattern>
          <pattern
            id="magentaDotFill"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <rect width="12" height="12" fill="#C227F5" />
            <circle cx="4" cy="4" r="2.2" fill="#0B1B5E" fillOpacity="0.55" />
            <circle cx="10" cy="10" r="1.8" fill="#18D9D2" fillOpacity="0.4" />
          </pattern>
        </defs>

        {/* Ambient right radial glow */}
        <rect width="1440" height="620" fill="url(#heroGlowRight)" />

        {/* Large subtle geometric facets */}
        <polygon points="0,0 560,0 240,620 0,620" fill="#050B38" fillOpacity="0.55" />
        <polygon points="300,0 920,0 620,620 120,620" fill="#0A2378" fillOpacity="0.32" />
        <polygon points="680,620 960,120 1440,340 1440,620" fill="#061654" fillOpacity="0.38" />

        {/* Top-left cyan dot-matrix block */}
        <rect x="34" y="18" width="132" height="72" fill="url(#cyanDotMatrix)" />

        {/* Bottom cyan accent ribbon */}
        <rect x="0" y="598" width="1440" height="22" fill="#14D8CE" fillOpacity="0.88" />
        <polygon points="480,620 550,530 620,620" fill="#14D8CE" fillOpacity="0.22" />
        <polygon points="1220,620 1295,515 1370,620" fill="#14D8CE" fillOpacity="0.22" />
        <polygon points="1310,620 1370,545 1430,620" fill="#00B4F0" fillOpacity="0.26" />

        {/* Right-side stylized educator desk & screen illustration */}
        {!compact && (
          <g opacity="0.96">
            {/* Circular backdrop behind desk */}
            <circle cx="1115" cy="295" r="295" fill="#0B5BC4" fillOpacity="0.42" />
            <circle cx="1115" cy="295" r="295" stroke="#18D9D2" strokeOpacity="0.16" strokeWidth="2" />

            {/* Framed classroom diamond wall art */}
            <rect
              x="982"
              y="28"
              width="256"
              height="68"
              rx="4"
              fill="#07226B"
              stroke="#083B91"
              strokeWidth="8"
            />
            <g stroke="#14D8CE" strokeOpacity="0.55" strokeWidth="2">
              <polygon points="1015,62 1030,44 1045,62 1030,80" fill="#0C69BF" fillOpacity="0.35" />
              <polygon points="1062,62 1077,44 1092,62 1077,80" fill="#0C69BF" fillOpacity="0.35" />
              <polygon points="1109,62 1124,44 1139,62 1124,80" fill="#0C69BF" fillOpacity="0.35" />
              <polygon points="1156,62 1171,44 1186,62 1171,80" fill="#0C69BF" fillOpacity="0.35" />
              <polygon points="1203,62 1218,44 1233,62 1218,80" fill="#0C69BF" fillOpacity="0.35" />
            </g>

            {/* Burst lines top-left of monitor */}
            <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round">
              <line x1="896" y1="138" x2="872" y2="124" />
              <line x1="910" y1="118" x2="896" y2="92" />
              <line x1="932" y1="108" x2="930" y2="82" />
            </g>

            {/* Monitor body */}
            <rect x="928" y="138" width="276" height="176" rx="8" fill="#0C63B8" />
            <rect x="942" y="152" width="248" height="134" rx="4" fill="#170E52" />

            {/* Stylized handwritten RPH notes inside screen */}
            <path
              d="M956 178 C966 158, 976 198, 988 176 C998 158, 1006 196, 1018 176 C1030 158, 1038 196, 1052 176 C1064 156, 1072 196, 1086 176 C1100 156, 1110 194, 1124 176 C1138 158, 1148 196, 1170 176"
              stroke="#E625B6"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M956 218 C968 198, 978 238, 992 216 C1004 198, 1014 236, 1028 216 C1042 196, 1052 234, 1066 216 C1082 196, 1094 236, 1108 216 C1122 198, 1136 236, 1172 216"
              stroke="#E625B6"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M958 258 C972 238, 982 274, 998 256 C1012 238, 1022 272, 1038 254 C1054 236, 1066 272, 1082 254 C1098 238, 1110 272, 1126 254 C1142 238, 1154 270, 1172 254"
              stroke="#E625B6"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Monitor stand */}
            <polygon points="1044,314 1088,314 1096,356 1036,356" fill="#094894" />
            <rect x="1004" y="354" width="124" height="10" rx="4" fill="#18B6E8" fillOpacity="0.65" />

            {/* Open RPH notebook on desk */}
            <polygon points="944,366 1060,350 1180,366 1062,384" fill="#18B2E6" fillOpacity="0.55" />
            <polygon points="944,366 1062,384 1062,390 944,372" fill="#0B3D91" />

            {/* Stack of curriculum books */}
            <rect x="1220" y="256" width="16" height="106" rx="2" fill="#14B8E0" />
            <rect x="1238" y="252" width="18" height="110" rx="2" fill="#0D80C9" />
            <rect x="1258" y="260" width="16" height="102" rx="2" fill="#14D8CE" fillOpacity="0.8" />

            {/* Potted plant with idea speech bubbles */}
            <polygon points="1330,310 1398,310 1388,366 1340,366" fill="#040B33" />
            <path d="M1364 310 C1344 268, 1322 246, 1310 226" stroke="#18D9D2" strokeWidth="3.5" fill="none" />
            <path d="M1364 310 C1356 260, 1356 232, 1362 204" stroke="#18D9D2" strokeWidth="3.5" fill="none" />
            <path d="M1364 310 C1382 270, 1404 244, 1420 226" stroke="#18D9D2" strokeWidth="3.5" fill="none" />

            {/* Orange speech bubbles */}
            <g fill="#F48024">
              <ellipse cx="1332" cy="222" rx="18" ry="15" />
              <ellipse cx="1378" cy="212" rx="22" ry="17" />
              <ellipse cx="1364" cy="256" rx="20" ry="16" />
              <ellipse cx="1396" cy="272" rx="18" ry="14" />
            </g>
            <g fill="#FFFFFF" fillOpacity="0.9">
              <circle cx="1325" cy="222" r="2" />
              <circle cx="1332" cy="222" r="2" />
              <circle cx="1339" cy="222" r="2" />
              <circle cx="1370" cy="212" r="2.2" />
              <circle cx="1378" cy="212" r="2.2" />
              <circle cx="1386" cy="212" r="2.2" />
              <circle cx="1357" cy="256" r="2" />
              <circle cx="1364" cy="256" r="2" />
              <circle cx="1371" cy="256" r="2" />
            </g>

            {/* Desk surface */}
            <rect x="820" y="366" width="620" height="14" fill="#0B5BC4" fillOpacity="0.7" />
          </g>
        )}

        {/* Bottom-left signature magenta polygon + navy squiggle badge */}
        <g transform={compact ? 'translate(0, 60) scale(0.75)' : ''}>
          <polygon
            points="30,520 112,482 182,534 150,612 52,610"
            fill="url(#magentaDotFill)"
          />
          <ellipse cx="52" cy="586" rx="54" ry="44" fill="#07124A" />
          <path
            d="M12 568 C22 552, 32 584, 42 566 C52 550, 62 584, 72 566 C82 550, 92 584, 98 566"
            stroke="#18D9D2"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M14 590 C24 574, 34 606, 44 588 C54 572, 64 606, 74 588 C84 572, 94 606, 100 588"
            stroke="#18D9D2"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M18 610 C28 594, 38 622, 48 608 C58 594, 68 622, 78 608 C86 596, 94 616, 100 606"
            stroke="#18D9D2"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};
