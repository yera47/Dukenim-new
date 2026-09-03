"use client";

import { useEffect } from "react";

// Last-resort boundary: replaces the root layout, so it must ship its own
// <html>/<body> and cannot assume globals.css or fonts are available.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "4rem 1.5rem",
          background: "#071B17",
          color: "#F4F0E8",
          fontFamily: "'Manrope', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B08A50" }}>
            Dukenim
          </p>
          <h1 style={{ margin: "1.5rem 0 0", fontSize: "clamp(1.7rem, 5vw, 2.4rem)", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            Сервис временно недоступен
          </h1>
          <p style={{ margin: "1rem auto 0", maxWidth: "42ch", fontSize: "0.98rem", lineHeight: 1.7, color: "rgba(232,223,208,0.8)" }}>
            Произошла непредвиденная ошибка. Обновите страницу через минуту.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.75rem", fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(232,223,208,0.45)" }}>
              код ошибки: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2.25rem",
              minHeight: "3rem",
              padding: "0 1.5rem",
              border: 0,
              borderRadius: "0.72rem",
              background: "#B08A50",
              color: "#071B17",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Обновить страницу
          </button>
        </div>
      </body>
    </html>
  );
}
