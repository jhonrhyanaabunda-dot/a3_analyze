import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dealership Visibility Analyzer · A3 Brands",
  description:
    "A real-data read on where your dealership is losing visibility across Google, your OEM site, local pack, and AI search engines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="space-bg" aria-hidden="true">
          <div className="stars stars-far" />
          <div className="stars stars-mid" />
          <div className="stars stars-near" />
          <div className="twinkles">
            {[
              { l: "8%", t: "22%", s: 2, d: "0s", u: "4.2s" },
              { l: "17%", t: "61%", s: 1.5, d: "1.8s", u: "5.1s" },
              { l: "26%", t: "14%", s: 2.5, d: "3.1s", u: "6.3s" },
              { l: "39%", t: "44%", s: 1.5, d: "0.7s", u: "4.8s" },
              { l: "54%", t: "20%", s: 2, d: "2.4s", u: "5.6s" },
              { l: "63%", t: "68%", s: 1.5, d: "4.0s", u: "4.4s" },
              { l: "71%", t: "33%", s: 2.5, d: "1.2s", u: "6.8s" },
              { l: "84%", t: "55%", s: 2, d: "3.6s", u: "5.0s" },
              { l: "92%", t: "12%", s: 1.5, d: "0.4s", u: "4.6s" },
              { l: "47%", t: "78%", s: 2, d: "2.9s", u: "5.9s" },
            ].map((s, i) => (
              <i
                key={i}
                className="tw"
                style={{
                  left: s.l,
                  top: s.t,
                  width: `${s.s}px`,
                  height: `${s.s}px`,
                  animationDelay: s.d,
                  animationDuration: s.u,
                }}
              />
            ))}
          </div>
          <div className="space-moon">
            <div className="moon-orb" />
            <div className="moon-shade" />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
