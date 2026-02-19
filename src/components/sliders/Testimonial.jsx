import { sliderProps } from "@common/sliderProps";
import { Swiper, SwiperSlide } from "swiper/react";

import Data from '@data/sliders/testimonial';

const TestimonialSlider = () => {
  return (
    <>
        {/* Onovo Reviews */}
        <section className="onovo-section gap-bottom-140">
            <div className="container">

                {/* Reviews */}
                <div className="onovo-reviews">
                    <div className="row">
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-6">

                            {/* Heading */}
                            <div className="onovo-reviews-titles">
                                <h2 className="onovo-title-2">
                                    <span data-splitting data-onovo-scroll>{Data.title}</span>
                                </h2>
                                <div className="onovo-reviews-summary">
                                    <span className="label onovo-text-black">
                                        <span data-splitting data-onovo-scroll>{Data.rating.value}</span>
                                    </span>
                                    <span className="onovo-stars">
                                        <i className="fas fa-star" />
                                        <i className="fas fa-star" />
                                        <i className="fas fa-star" />
                                        <i className="fas fa-star" />
                                        <i className="far fa-star" />
                                    </span>
                                    <span className="label">
                                        <span data-splitting data-onovo-scroll>{Data.rating.label}</span>
                                    </span>
                                </div>
                            </div>

                        </div>
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-6">

                            {/* Reviews swiper */}
                            <div className="onovo-reviews-carousel">
                                <Swiper
                                    {...sliderProps.testimonialSlider}
                                    className="swiper-container js-reviews-carousel"
                                >
                                    {Data.items.map((item, key) => (
                                    <SwiperSlide key={`tts-slide-${key}`} className="swiper-slide onovo-reviews-item">
                                        <div className="text">
                                            <div data-splitting>
                                                <p dangerouslySetInnerHTML={{__html: "“"+item.text+"”"}} />
                                            </div>
                                        </div>
                                        <h5 className="title">
                                            <span data-splitting>{item.name}</span>
                                        </h5>
                                        <div className="subtitle">
                                            <span data-splitting>{item.role}</span>
                                        </div>
                                        <div className="onovo-stars stars--small">
                                            <i className="fas fa-star" />
                                            <i className="fas fa-star" />
                                            <i className="fas fa-star" />
                                            <i className="fas fa-star" />
                                            <i className="fas fa-star" />
                                        </div>
                                    </SwiperSlide>
                                    ))}
                                </Swiper>

                                {/* navs */}
                                <div className="js-reviews-carousel-navs">
                                    <div className="onovo-prev js-reviews-carousel-prev onovo-hover-2">
                                        <i />
                                    </div>
                                    <div className="onovo-next js-reviews-carousel-next onovo-hover-2">
                                        <i />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </section>
    </>
  );
};
export default TestimonialSlider;
