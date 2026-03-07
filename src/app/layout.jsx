import appData from "@data/app.json";
import Providers from "@/src/app/providers";
import { Epilogue } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "../styles/globals.css";
import "../styles/app.css";

const epilogue = Epilogue({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata = {
  title: appData?.settings?.siteName || "TeachFromHome",
  description: "TeachFromHome portal",
};

const RootLayout = ({ children }) => {
  return (
    <html lang="sr">
      <body className={epilogue.className}>
        <span className="tfh-visually-hidden" aria-hidden="true">
          {"\u010D\u0107\u017E\u0161\u0111 \u010C\u0106\u017D\u0160\u0110"}
        </span>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
