import appData from "@data/app.json";
import Providers from "@/src/app/providers";
import { Epilogue } from "next/font/google";

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
          čćžšđ ČĆŽŠĐ
        </span>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
