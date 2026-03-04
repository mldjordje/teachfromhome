"use client";

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/react";
import { LanguageProvider } from "@components/i18n/LanguageProvider";
import { AuthProvider } from "@components/auth/AuthProvider";

const Providers = ({ children }) => {
  return (
    <SessionProvider>
      <LanguageProvider>
        <HeroUIProvider>
          <AuthProvider>{children}</AuthProvider>
        </HeroUIProvider>
      </LanguageProvider>
    </SessionProvider>
  );
};

export default Providers;
