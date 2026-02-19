import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* meta begin */}
          <meta charSet="UTF-8" />
          <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
          {/* meta end */}

          {/* favicon begin */}
          <link rel="shortcut icon" href="/favicon/favicon.ico" type="image/x-icon" />
	        <link rel="icon" href="/favicon/favicon.ico" type="image/x-icon" />
          {/* favicon */}

          {/* Fonts */}
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Epilogue%3Aital%2Cwght%400%2C100%3B0%2C200%3B0%2C300%3B0%2C400%3B0%2C500%3B0%2C600%3B0%2C700%3B0%2C800%3B0%2C900%3B1%2C100%3B1%2C200%3B1%2C300%3B1%2C400%3B1%2C500%3B1%2C600%3B1%2C700%3B1%2C800%3B1%2C900&#038;display=swap" type="text/css" media="all" />
          <link rel="preconnect" href="https://fonts.gstatic.com/" crossOrigin="true" />

          {/* public assets begin */}
          <link rel="stylesheet" href="/css/vendors/bootstrap.css" />
          <link rel="stylesheet" href="/fonts/font-awesome/css/font-awesome.css" />
          <link rel="stylesheet" href="/css/vendors/magnific-popup.css" />
          {/* public assets end */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
