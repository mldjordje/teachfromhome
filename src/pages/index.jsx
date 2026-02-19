import React from "react";
import Head from "next/head";
import Layouts from "@layouts/Layouts";
import TeachFromHomeLanding from "@components/pages/TeachFromHomeLanding";

const Home1 = () => {
  const title = "TeachFromHome.app | Online posao od kuce | Teach English Online";
  const description =
    "TeachFromHome.app zaposljava online English teachere iz Srbije. Rad od kuce, fleksibilno vreme, stabilna zarada i brza prijava.";
  const canonical = "https://teachfromhome.app/";
  const ogImage = "https://teachfromhome.app/images/teachfromhome/image1.jpeg";

  return (
    <Layouts>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
      </Head>
      <TeachFromHomeLanding />
    </Layouts>
  );
};
export default Home1;
