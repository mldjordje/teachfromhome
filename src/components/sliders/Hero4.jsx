import { sliderProps } from "@common/sliderProps";
import { Swiper, SwiperSlide } from "swiper/react";

import Data from '@data/sliders/hero-4';
import Link from "next/link";

const Hero4Slider = () => {
  return (
    <>
        {/* Onovo Hero Parallax */}
        <section className="onovo-section">
            
            <Swiper
                {...sliderProps.hero4Slider}
                className="swiper-container onovo-hero-parallax js-hero-parallax"
            >
                {Data.items.map((item, key) => (
                <SwiperSlide key={`h4s-slide-${key}`} className="swiper-slide">
                <div className="onovo-hero-parallax-section">
                    <div className="image" data-dimg={item.image.desktop} data-mimg={item.image.mobile} />
                    <div className="container">
                        <div className="onovo-subtitle-1 onovo-text-white">
                            <span data-splitting>{item.subtitle}</span>
                        </div>
                        <div className="title onovo-text-white">
                            <span data-splitting dangerouslySetInnerHTML={{__html: item.title}} />
                            <span className="sep" style={{"backgroundImage": "url(/images/title_after.svg)"}} />
                        </div>
                        <div className="onovo-bts">
                            <Link className="onovo-btn btn--border onovo-hover-btn btn--color btn--white" href={item.button.link}>
                                <i className="arrow">
                                    <span></span>
                                </i>
                                <span>{item.button.label}</span>
                            </Link>
                        </div>
                    </div>
                </div>
                </SwiperSlide>
                ))}

                {/*navs*/}
                <div className="onovo-navs js-hero-parallax-navs">
                    <div className="onovo-prev js-hero-parallax-prev nav--white onovo-hover-2">
                        <i />
                    </div>
                    <div className="onovo-next js-hero-parallax-next nav--white onovo-hover-2">
                        <i />
                    </div>
                </div>
                
                {/*paginations*/}
                <div className="onovo-paginations-container onovo-paginations-container-vertical pag--white">
                    <div className="onovo-paginations js-hero-parallax-pagination" />
                    <div className="swiper-nav-active" />
                </div>
            </Swiper>
        </section>
    </>
  );
};
export default Hero4Slider;