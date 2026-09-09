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
 * One certificate, at whatever width its container gives it.
 *
 * The sheet is markup, not a picture of a sheet: every rule, sweep and line of
 * type is an element, so it prints at the printer's own resolution instead of
 * the 170dpi a 2000px image works out to across A4 landscape, and the text can
 * be selected, searched and read by a screen reader.
 *
 * Everything is placed as a percentage of the sheet and sized in `cqw`, taken
 * from the signed artwork's proportions, so one set of markup serves the
 * thumbnail, the full page and the print.
 */

/** Colours sampled from the signed artwork. */
const NAVY = "#1A4156";
const NAVY_DEEP = "#123A56";
const GOLD = "#C9922A";
const GOLD_LIGHT = "#EFC96A";
const GOLD_RULE = "#B9862B";
const INK = "#0E0E0E";

export function Certificate({
  examType,
  recipient,
  marks,
}: {
  examType: ExamType;
  recipient: string;
  marks: CertificateMarks;
}) {
  const design = certificateDesign(examType);

  return (
    <div className="relative aspect-[1000/707] w-full overflow-hidden bg-[#FCF7EB] [container-type:inline-size]">
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_38%,#FFFDF8_0%,#FCF7EB_55%,#F4ECD9_100%)]" />

      <CornerFlourish />
      <BaseSweep />
      <GoldFrame />

      <div className="absolute inset-0" style={{ color: NAVY_DEEP }}>
        <Row top="12.6%" className="gap-[1.8cqw]">
          <Bar w="8.8cqw" />
          <span className="cert-serif text-[4cqw] tracking-[0.15em]">
            CERTIFICATE OF
          </span>
          <Bar w="8.8cqw" />
        </Row>

        <Row top="20.9%">
          <span className="cert-serif text-[8.2cqw] font-black leading-none">
            COMPLETION
          </span>
        </Row>

        <Row top="29.1%" className="gap-[1.6cqw]">
          <Bar w="7.2cqw" />
          <span className="text-[2.3cqw] font-light">for the</span>
          <Bar w="7.2cqw" />
        </Row>

        <Row top="34.6%" style={{ paddingInline: "9.6%" }}>
          <span
            className="cert-serif font-bold uppercase leading-tight"
            style={{ fontSize: design.titleSize }}
          >
            {design.title}
          </span>
        </Row>

        <Row top="40%">
          <span className="text-[2.3cqw] tracking-[0.03em]">AWARDED TO</span>
        </Row>

        {/* The recipient, in the gap above the rule. */}
        <div
          className="absolute flex items-end justify-center text-center"
          style={{ left: "16.5%", right: "16.5%", top: "44%", height: "12.5%" }}
        >
          <p className="cert-script text-[5.4cqw] leading-none">{recipient}</p>
        </div>

        <div
          className="absolute"
          style={{
            left: "16.5%",
            right: "16.5%",
            top: "57.1%",
            height: "0.2cqw",
            background: "#5C6470",
          }}
        />

        <div
          className="absolute text-center"
          style={{ left: "16.5%", right: "16.5%", top: "58.7%" }}
        >
          <p className="text-[1.8cqw] leading-[1.55]" style={{ color: "#1B1B1B" }}>
            {CERTIFICATE_BLURB}
          </p>
        </div>

        <Row top="71.4%">
          <span className="text-[2cqw]">Signed by:</span>
        </Row>

        {/* Centre and height are the signature's own box in the artwork
            (y 1044-1167 of 1414). Sized any taller, its ascender climbs into
            "Signed by:" instead of rising beside it. */}
        <Row top="78.2%">
          {marks.signature ? (
            // eslint-disable-next-line @next/next/no-img-element -- a keyed
            // cut-out sized in container units; the loader would only re-encode
            // 13KB and cannot serve it at a fluid height.
            <img
              src={marks.signature}
              alt=""
              style={{ height: "6.15cqw", width: "auto" }}
            />
          ) : (
            <DrawnSignature />
          )}
        </Row>

        <Row top="81.7%">
          <span className="text-[2.1cqw] font-bold" style={{ color: INK }}>
            {CERTIFICATE_SIGNER}
          </span>
        </Row>

        <Row top="84.4%">
          <span className="text-[1.8cqw]" style={{ color: INK }}>
            {CERTIFICATE_SIGNER_ROLE}
          </span>
        </Row>

        <div
          className="absolute text-center"
          style={{ left: "4.2%", bottom: "1.7%", width: "11.8%" }}
        >
          {marks.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- as above.
            <img
              src={marks.logo}
              alt="Dracaena"
              className="mx-auto"
              style={{ width: "10cqw", height: "auto" }}
            />
          ) : (
            <DrawnLogo />
          )}
        </div>

        <div
          className="absolute text-right text-white"
          style={{ right: "4.2%", bottom: "2.8%" }}
        >
          <p className="text-[2.6cqw] font-bold leading-none tracking-[0.22em]">
            GENERATION
          </p>
          <p className="text-[6cqw] font-extrabold leading-[0.9]">NEXT</p>
        </div>
      </div>
    </div>
  );
}

/** A row centred across the sheet at a given height. */
function Row({
  top,
  children,
  className = "",
  style,
}: {
  top: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`absolute left-0 right-0 flex -translate-y-1/2 items-center justify-center text-center ${className}`}
      style={{ top, ...style }}
    >
      {children}
    </div>
  );
}

/** The short gold bar flanking each kicker line. */
function Bar({ w }: { w: string }) {
  return (
    <i
      className="block"
      style={{
        width: w,
        height: "0.4cqw",
        background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD})`,
      }}
    />
  );
}

function CornerFlourish() {
  return (
    <svg
      className="absolute left-0 top-0"
      style={{ width: "33%", height: "41%" }}
      viewBox="0 0 330 290"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path fill={NAVY} d="M0,0 L246,0 C 186,50 108,134 58,290 L0,290 Z" />
      <path
        fill={GOLD}
        d="M150,0 L246,0 C 186,50 108,134 58,290 L14,290 C 70,128 116,48 150,0 Z"
      />
      <path
        fill={GOLD_LIGHT}
        opacity=".85"
        d="M196,0 L246,0 C 186,50 108,134 58,290 L34,290 C 96,120 160,42 196,0 Z"
      />
      <path fill={NAVY} d="M0,0 L168,0 C 116,46 58,128 22,290 L0,290 Z" />
    </svg>
  );
}

function BaseSweep() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full"
      style={{ height: "24%" }}
      viewBox="0 0 1000 168"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        fill={GOLD_LIGHT}
        opacity=".9"
        d="M0,58 C 250,18 470,96 1000,10 L1000,168 L0,168 Z"
      />
      <path fill={GOLD} d="M0,74 C 250,32 470,112 1000,24 L1000,168 L0,168 Z" />
      <path fill={NAVY} d="M0,96 C 250,56 470,134 1000,46 L1000,168 L0,168 Z" />
      <path
        fill="none"
        stroke={GOLD_LIGHT}
        strokeWidth="3"
        d="M0,126 C 230,92 450,158 1000,78"
      />
    </svg>
  );
}

function GoldFrame() {
  return (
    <div
      className="pointer-events-none absolute"
      style={{ inset: "2.4%", borderWidth: "0.2cqw", borderColor: GOLD_RULE, borderStyle: "solid" }}
    >
      <div
        className="absolute"
        style={{
          top: "1.4cqw",
          right: "1.4cqw",
          width: "10.8cqw",
          height: "7.8cqw",
          borderTop: `0.2cqw solid ${GOLD_RULE}`,
          borderRight: `0.2cqw solid ${GOLD_RULE}`,
        }}
      />
    </div>
  );
}

/** Stand-in until the real signature is supplied. */
function DrawnSignature() {
  return (
    <svg viewBox="0 0 300 110" aria-hidden="true" style={{ height: "8cqw" }}>
      <path
        fill="none"
        stroke="#0B0B0B"
        strokeWidth="5"
        strokeLinecap="round"
        d="M28,92 C 44,10 70,4 66,52 C 63,96 40,102 44,64 C 48,26 92,10 108,58
           C 118,90 96,104 96,74 C 96,40 132,26 146,62 C 156,88 138,100 138,76
           C 138,46 176,30 192,64 C 202,86 186,98 186,78 C 186,50 226,36 248,58 L 276,32"
      />
      <path
        fill="none"
        stroke="#0B0B0B"
        strokeWidth="4"
        strokeLinecap="round"
        d="M52,86 C 96,72 168,70 214,80"
      />
    </svg>
  );
}

/** Stand-in until the real phoenix is supplied. */
function DrawnLogo() {
  return (
    <>
      <svg
        viewBox="0 0 118 86"
        aria-hidden="true"
        className="mx-auto"
        style={{ width: "6.6cqw" }}
      >
        <path
          fill="#E0AE45"
          d="M59,10 C 66,22 74,28 88,30 C 78,36 72,44 70,56 C 66,46 62,42 59,40 C 56,42 52,46 48,56 C 46,44 40,36 30,30 C 44,28 52,22 59,10 Z"
        />
        <path
          fill={GOLD}
          d="M8,26 C 24,26 38,34 48,48 C 36,44 24,44 12,48 C 14,40 12,32 8,26 Z"
        />
        <path
          fill={GOLD}
          d="M110,26 C 94,26 80,34 70,48 C 82,44 94,44 106,48 C 104,40 106,32 110,26 Z"
        />
        <path
          fill="#E0AE45"
          d="M59,44 C 64,54 66,64 64,76 L 54,76 C 52,64 54,54 59,44 Z"
        />
      </svg>
      <p
        className="cert-serif text-[1.3cqw] font-bold tracking-[0.16em]"
        style={{ color: "#E0AE45" }}
      >
        DRACAENA
      </p>
    </>
  );
}
