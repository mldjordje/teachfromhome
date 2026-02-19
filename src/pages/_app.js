import React from "react";
import Head from "next/head";
import appData from "@data/app.json";
import { AuthProvider } from "@components/auth/AuthProvider";

import '../styles/scss/style.scss';
import "../styles/globals.css";
import "../styles/app.css";

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
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  );
}

export default MyApp;
