import React from "react";
import Head from "next/head";
import { SessionProvider } from "next-auth/react";
import appData from "@data/app.json";
import { AuthProvider } from "@components/auth/AuthProvider";
import { LanguageProvider } from "@components/i18n/LanguageProvider";
import { HeroUIProvider } from "@heroui/react";

import '../styles/scss/style.scss';
import "../styles/globals.css";

import { register } from "swiper/element/bundle";
// register Swiper custom elements
register();

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
          {/* seo begin */}
          <title>{appData.settings.siteName}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="HandheldFriendly" content="true" />
          <meta name="author" content="TeachFromHome.app" />
          {/* seo end */}        
      </Head>
      <LanguageProvider>
        <HeroUIProvider>
          <SessionProvider session={pageProps.session}>
            <AuthProvider>
              <span className="tfh-visually-hidden" aria-hidden="true">
                čćžšđ ČĆŽŠĐ
              </span>
              <Component {...pageProps} />
            </AuthProvider>
          </SessionProvider>
        </HeroUIProvider>
      </LanguageProvider>
    </>
  );
}

export default MyApp;
