import appData from "@data/app.json";
import Providers from "@/src/app/providers";

import "../styles/scss/style.scss";
import "../styles/globals.css";
import "../styles/app.css";

export const metadata = {
  title: appData?.settings?.siteName || "TeachFromHome",
  description: "TeachFromHome portal",
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
