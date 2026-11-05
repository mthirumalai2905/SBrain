import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const themeBoot = `(function(){try{var a=localStorage.getItem('brain-appearance')||'system';var dark=a==='dark'||(a!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.appearance=a==='dark'||a==='light'?a:'system';var mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener('change',function(){var mode=localStorage.getItem('brain-appearance')||'system';if(mode==='system')document.documentElement.dataset.theme=mq.matches?'dark':'light';});}catch(e){}})();`;

export const metadata: Metadata = {
  title: { default: "Brain", template: "%s · Brain" },
  description: "Control centre for the Synx websites.",
  applicationName: "Brain",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <Script id="brain-theme" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        {children}
      </body>
    </html>
  );
}
