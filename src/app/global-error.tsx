"use client";

import { useEffect } from "react";

/**
 * The last boundary: an error thrown by the root layout itself.
 *
 * It replaces the whole document, so it renders its own <html> and <body> and
 * cannot use the app's providers, nav or fonts — the layout that would have
 * supplied them is the thing that failed. The styles are inline for the same
 * reason: a stylesheet the failed layout never linked is a stylesheet this
 * screen cannot rely on.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#FBF7EE",
          color: "#0B2340",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(3rem, 12vw, 5rem)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
            }}
          >
            Oops
          </p>

          <div
            style={{
              width: "4rem",
              height: "6px",
              borderRadius: "999px",
              background: "#FFD400",
              margin: "1.5rem auto",
            }}
          />

          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>
            The app could not start
          </h1>

          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "1rem",
              lineHeight: 1.7,
              color: "#5B6472",
            }}
          >
            Reload the page to try again. If it keeps happening, sign in again
            from the start page.
          </p>

          <button
            onClick={reset}
            style={{
              marginTop: "2rem",
              minHeight: "3rem",
              padding: "0 1.75rem",
              borderRadius: "6px",
              border: "none",
              background: "#FFD400",
              color: "#0B2340",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          {error.digest && (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.75rem",
                color: "#5B6472",
              }}
            >
              Reference: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
