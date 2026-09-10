import {
  CERTIFICATE_BLURB,
  CERTIFICATE_SIGNER,
  CERTIFICATE_SIGNER_ROLE,
  certificateDesign,
} from "@/lib/helper/certificate";
import type { CertificateMarks } from "@/lib/helper/certificate-artwork";
import type { ExamType } from "@/lib/types/common";
import type { CSSProperties, ReactNode } from "react";

/**
 * One certificate, as satori lays it out for `ImageResponse`.
 *
 * The browser never receives this markup — only the PNG it renders to — so the
 * sheet cannot be opened in devtools and retyped with someone else's name.
 * That is the whole reason it is drawn here rather than in the page.
 *
 * It is still drawn rather than photographed: every rule, sweep and line of
 * type is an element, so the sheet renders at SHEET_WIDTH rather than at some
 * artwork's own resolution. Raise the two constants below and everything scales
 * with them.
 *
 * Satori is not a browser. It lays out a subset of CSS — flexbox and absolute
 * positioning, no grid, no container queries, no class names — so this is a
 * separate component from the app's own markup rather than a shared one, and
 * every measurement is a plain number. Two rules bite hardest:
 *   - anything with more than one child needs `display: flex` spelled out
 *   - images must arrive as data URIs; there is no page to resolve a path from
 */

/** The rendered sheet, in pixels. The design's own grid is 1000 x 707. */
export const SHEET_WIDTH = 2000;
export const SHEET_HEIGHT = 1414;

/** A share of the sheet's width, in px — the `cqw` the page markup used. */
const w = (share: number) => (share * SHEET_WIDTH) / 100;

/** A share of the sheet's height, in px. */
const h = (share: number) => (share * SHEET_HEIGHT) / 100;

/** Colours sampled from the signed artwork. */
const NAVY = "#1A4156";
const NAVY_DEEP = "#123A56";
const GOLD = "#C9922A";
const GOLD_LIGHT = "#EFC96A";
const GOLD_RULE = "#B9862B";
const INK = "#0E0E0E";

const SERIF = "Playfair Display";
const SCRIPT = "Great Vibes";
const SANS = "Hanken Grotesk";

/** An inline SVG as an `<img>` source. Satori draws these; it does not lay out
 *  SVG children of its own. */
const svgUrl = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const CORNER_FLOURISH = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 290" preserveAspectRatio="none">
     <path fill="${NAVY}" d="M0,0 L246,0 C 186,50 108,134 58,290 L0,290 Z"/>
     <path fill="${GOLD}" d="M150,0 L246,0 C 186,50 108,134 58,290 L14,290 C 70,128 116,48 150,0 Z"/>
     <path fill="${GOLD_LIGHT}" opacity=".85" d="M196,0 L246,0 C 186,50 108,134 58,290 L34,290 C 96,120 160,42 196,0 Z"/>
     <path fill="${NAVY}" d="M0,0 L168,0 C 116,46 58,128 22,290 L0,290 Z"/>
   </svg>`,
);

const BASE_SWEEP = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 168" preserveAspectRatio="none">
     <path fill="${GOLD_LIGHT}" opacity=".9" d="M0,58 C 250,18 470,96 1000,10 L1000,168 L0,168 Z"/>
     <path fill="${GOLD}" d="M0,74 C 250,32 470,112 1000,24 L1000,168 L0,168 Z"/>
     <path fill="${NAVY}" d="M0,96 C 250,56 470,134 1000,46 L1000,168 L0,168 Z"/>
     <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="3" d="M0,126 C 230,92 450,158 1000,78"/>
   </svg>`,
);

/** Stand-in until the real signature is supplied. */
const DRAWN_SIGNATURE = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 110">
     <path fill="none" stroke="#0B0B0B" stroke-width="5" stroke-linecap="round"
       d="M28,92 C 44,10 70,4 66,52 C 63,96 40,102 44,64 C 48,26 92,10 108,58 C 118,90 96,104 96,74 C 96,40 132,26 146,62 C 156,88 138,100 138,76 C 138,46 176,30 192,64 C 202,86 186,98 186,78 C 186,50 226,36 248,58 L 276,32"/>
     <path fill="none" stroke="#0B0B0B" stroke-width="4" stroke-linecap="round"
       d="M52,86 C 96,72 168,70 214,80"/>
   </svg>`,
);

/** Stand-in until the real phoenix is supplied. */
const DRAWN_LOGO = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 86">
     <path fill="#E0AE45" d="M59,10 C 66,22 74,28 88,30 C 78,36 72,44 70,56 C 66,46 62,42 59,40 C 56,42 52,46 48,56 C 46,44 40,36 30,30 C 44,28 52,22 59,10 Z"/>
     <path fill="${GOLD}" d="M8,26 C 24,26 38,34 48,48 C 36,44 24,44 12,48 C 14,40 12,32 8,26 Z"/>
     <path fill="${GOLD}" d="M110,26 C 94,26 80,34 70,48 C 82,44 94,44 106,48 C 104,40 106,32 110,26 Z"/>
     <path fill="#E0AE45" d="M59,44 C 64,54 66,64 64,76 L 54,76 C 52,64 54,54 59,44 Z"/>
   </svg>`,
);

export function CertificateImage({
  examType,
  recipient,
  marks,
}: {
  examType: ExamType;
  recipient: string;
  marks: CertificateMarks;
}) {
  const design = certificateDesign(examType);
  const titleSize = w(Number.parseFloat(design.titleSize));

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: SHEET_WIDTH,
        height: SHEET_HEIGHT,
        backgroundColor: "#FCF7EB",
        color: NAVY_DEEP,
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "radial-gradient(120% 100% at 50% 38%, #FFFDF8 0%, #FCF7EB 55%, #F4ECD9 100%)",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element -- satori renders
          this, not the browser; there is no image loader in that pipeline. */}
      <img
        src={CORNER_FLOURISH}
        alt=""
        width={w(33)}
        height={h(41)}
        style={{ position: "absolute", left: 0, top: 0 }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
      <img
        src={BASE_SWEEP}
        alt=""
        width={SHEET_WIDTH}
        height={h(24)}
        style={{ position: "absolute", left: 0, bottom: 0 }}
      />

      <GoldFrame />

      <Row top={12.6} gap={w(1.8)}>
        <Bar width={w(8.8)} />
        <span
          style={{
            fontFamily: SERIF,
            fontSize: w(4),
            letterSpacing: w(4) * 0.15,
          }}
        >
          CERTIFICATE OF
        </span>
        <Bar width={w(8.8)} />
      </Row>

      <Row top={20.9}>
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: w(8.2),
            lineHeight: 1,
          }}
        >
          COMPLETION
        </span>
      </Row>

      <Row top={29.1} gap={w(1.6)}>
        <Bar width={w(7.2)} />
        <span style={{ fontWeight: 300, fontSize: w(2.3) }}>for the</span>
        <Bar width={w(7.2)} />
      </Row>

      <Row top={34.6} style={{ paddingLeft: w(9.6), paddingRight: w(9.6) }}>
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: titleSize,
            lineHeight: 1.25,
            textTransform: "uppercase",
          }}
        >
          {design.title}
        </span>
      </Row>

      <Row top={40}>
        <span style={{ fontSize: w(2.3), letterSpacing: w(2.3) * 0.03 }}>
          AWARDED TO
        </span>
      </Row>

      {/* The recipient, in the gap above the rule. Their own name, read from
          their user row — never anything the browser supplied. */}
      <div
        style={{
          position: "absolute",
          left: w(16.5),
          right: w(16.5),
          top: h(44),
          height: h(12.5),
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <span
          style={{ fontFamily: SCRIPT, fontSize: w(5.4), lineHeight: 1 }}
        >
          {recipient}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: w(16.5),
          right: w(16.5),
          top: h(57.1),
          height: w(0.2),
          display: "flex",
          backgroundColor: "#5C6470",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: w(16.5),
          right: w(16.5),
          top: h(58.7),
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: w(1.8), lineHeight: 1.55, color: "#1B1B1B" }}>
          {CERTIFICATE_BLURB}
        </span>
      </div>

      {/* Raised to open up the band the signature sits in. The signature is
          123px tall and cannot be scaled down without distorting, so the room
          has to come from here rather than from it. */}
      <Row top={69.3}>
        <span style={{ fontSize: w(2) }}>Signed by:</span>
      </Row>

      {/* Sits in the gap between "Signed by:" and the signer's printed name,
          crossing neither.

          At its own 123px, and no smaller: satori sizes an image from whichever
          dimensions it is given, so a height on its own keeps the artwork's
          full width against a shorter box and squashes the writing. The gap is
          opened above instead. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: h(75.2),
          // Spelled out, and equal to the image's own height. A row that sizes
          // itself from its content gave satori licence to squash the writing
          // flat while keeping its width — the artwork has to be told exactly
          // how much room it has.
          height: w(6.15),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translateY(-50%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
        <img
          src={marks.signature ?? DRAWN_SIGNATURE}
          alt=""
          width={w(12.85)}
          height={w(6.15)}
          style={{ width: w(12.85), height: w(6.15) }}
        />
      </div>

      <Row top={81.7}>
        <span style={{ fontWeight: 700, fontSize: w(2.1), color: INK }}>
          {CERTIFICATE_SIGNER}
        </span>
      </Row>

      <Row top={84.4}>
        <span style={{ fontSize: w(1.8), color: INK }}>
          {CERTIFICATE_SIGNER_ROLE}
        </span>
      </Row>

      {/* Low enough that the mark sits on the navy rather than in the gold band
          above it. The mark's wings are the same gold as that band, so raising
          the lockup any further makes them disappear into it. */}
      <div
        style={{
          position: "absolute",
          left: w(4.2),
          bottom: h(2.8),
          width: w(11.8),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {marks.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- as above.
          <img
            src={marks.logo}
            alt=""
            width={w(10)}
            height={w(7.3)}
            style={{ width: w(10), height: w(7.3), objectFit: "contain" }}
          />
        ) : (
          // A wrapper, not a fragment: satori lays a fragment's children out as
          // one row, which put the mark and the wordmark side by side.
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
            <img
              src={DRAWN_LOGO}
              alt=""
              width={w(6.6)}
              height={w(4.81)}
              style={{ width: w(6.6), height: w(4.81) }}
            />
            <span
              style={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: w(1.9),
                letterSpacing: w(1.9) * 0.16,
                // The mark's own gold was too close to the navy behind it to
                // read at the size this prints at.
                color: GOLD_LIGHT,
              }}
            >
              DRACAENA
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          right: w(4.2),
          bottom: h(2.8),
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          color: "#FFFFFF",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: w(2.6),
            lineHeight: 1,
            letterSpacing: w(2.6) * 0.22,
          }}
        >
          GENERATION
        </span>
        <span style={{ fontWeight: 800, fontSize: w(6), lineHeight: 0.9 }}>
          NEXT
        </span>
      </div>
    </div>
  );
}

/** A row centred across the sheet at a given share of its height. */
function Row({
  top,
  gap,
  children,
  style,
}: {
  top: number;
  gap?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: h(top),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        transform: "translateY(-50%)",
        ...(gap ? { gap } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The short gold bar flanking each kicker line. */
function Bar({ width }: { width: number }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        height: w(0.4),
        backgroundImage: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD})`,
      }}
    />
  );
}

function GoldFrame() {
  return (
    <div
      style={{
        position: "absolute",
        top: h(2.4),
        bottom: h(2.4),
        left: w(2.4),
        right: w(2.4),
        display: "flex",
        border: `${w(0.2)}px solid ${GOLD_RULE}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: w(1.4),
          right: w(1.4),
          width: w(10.8),
          height: w(7.8),
          display: "flex",
          borderTop: `${w(0.2)}px solid ${GOLD_RULE}`,
          borderRight: `${w(0.2)}px solid ${GOLD_RULE}`,
        }}
      />
    </div>
  );
}
