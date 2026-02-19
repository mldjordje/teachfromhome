import React from "react";
import Head from "next/head";
import Layouts from "@layouts/Layouts";
import TeachFromHomeLanding from "@components/pages/TeachFromHomeLanding";

const Home4 = () => {
  const canonical = "https://teachfromhome.app/";

  return (
    <Layouts>
      <Head>
        <title>TeachFromHome.app | Fullscreen Parallax</title>
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="noindex,follow" />
      </Head>
      <TeachFromHomeLanding />
    </Layouts>
  );
};
export default Home4;
