import { sliderProps } from "@common/sliderProps";
import { Swiper, SwiperSlide } from "swiper/react";

import Data from '@data/sliders/hero-3';
import Link from "next/link";

const Hero3Slider = ( { projects } ) => {
  return (
    <>
        {/* Onovo Hero Carousel */}
        <section className="onovo-section onovo-section-full align-center">
            <div className="container">

                {/* Hero swiper */}
                <div className="onovo-hero-carousel-wrap">
                <div className="onovo-hero-carousel">
                    <Swiper
                        {...sliderProps.hero3Slider}
                        className="swiper-container js-hero-carousel"
                    >
                        {projects.slice(0, Data.numOfItems).map((item, key) => (
                        <SwiperSlide key={`h2s-slide-${key}`} className="swiper-slide">
                            <div className="onovo-hero-carousel-item">
                                <div className="slide">
                                    <Link href={`/projects/${item.id}`}>
                                        <span className="img" style={{"backgroundImage": "url("+item.image+")"}} />
                                    </Link>
                                </div>
                                <div className="titles">
                                    <div className="subtitle">
                                        <div className="text-line-inner">
                                            <span data-splitting>{item.category}</span>
                                        </div>
                                    </div>
                                    <h5 className="title">
                                        <div className="text-line-inner">
                                            <Link href={`/projects/${item.id}`}>
                                                <span data-splitting>{item.title}</span>
                                            </Link>
                                        </div>
                                    </h5>
                                </div>
                            </div>
                        </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* navs */}
                    <div className="js-hero-carousel-navs">
                        <div className="onovo-prev js-hero-carousel-prev onovo-hover-2">
                            <i />
                        </div>
                        <div className="onovo-next js-hero-carousel-next onovo-hover-2">
                            <i />
                        </div>
                    </div>

                </div>
                </div>
            </div>
        </section>
    </>
  );
};
export default Hero3Slider;