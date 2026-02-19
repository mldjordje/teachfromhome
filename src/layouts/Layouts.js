import { useEffect } from "react";
import appData from "@data/app.json";
import Footer from "./footers/Index";
import Header from "./headers/Index";
import Preloader from "./Preloader";

import dynamic from "next/dynamic";
const SplitScrollAnimation = dynamic( () => import("@components/SplitScrollAnimation"), { ssr: false } );

const Layouts = ({
  children,
  header,
  footer,
  noHeader,
  noFooter,
  darkHeader,
  cartButton
}) => {
  useEffect(() => {
    // preloader
    if (typeof window !== 'undefined') {
      document.querySelector('body').classList.remove('onovo--noscroll');
      const loader = document.getElementsByClassName('preloader');

      if (loader[0] && appData.settings.preloader){
        setTimeout(function(){
          loader[0].classList.add('closed');
          document.querySelector('body').classList.add('animated--swiper--active');
          loader[0].querySelector('.preloader__spinner').style.opacity = 0;
        }, 500);
        setTimeout(function(){
          loader[0].classList.add('loaded');
          document.querySelector('body').classList.add('animated--active');
        }, 1500);
      } else {
        loader[0].classList.add('loaded');
        document.querySelector('body').classList.add('animated--swiper--active');
        document.querySelector('body').classList.add('animated--active');
      }
    }
  }, []);

  return (
    <>
      <div className={noFooter ? "onovo-page" : `onovo-page footer--fixed`}>
        <Preloader />

        {!noHeader && (
          <Header
            header={header}
            darkHeader={darkHeader}
            cartButton={cartButton}
          />
        )}

        {/* Wrapper */}
		    <div className="wrapper">
          {children}
        </div>

        {!noFooter && <Footer footer={footer} />}

        <SplitScrollAnimation />
      </div>
    </>
  );
};
export default Layouts;
