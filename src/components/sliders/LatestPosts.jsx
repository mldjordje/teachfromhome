import Data from "@data/sliders/latest-posts.json";
import Date from '@library/date';
import Link from "next/link";
import { sliderProps } from "@common/sliderProps";
import { Swiper, SwiperSlide } from "swiper/react";

const LatestPostsSlider = ( { posts } ) => {
    return (
        <>
            {/* Onovo Blog Carousel */}
			<section className="onovo-section onovo-section-bg gap-top-140 gap-bottom-140">
				<div className="container">

					{/* Heading */}
					<div className="onovo-heading gap-bottom-40">
						<div className="onovo-subtitle-1">
							<span>{Data.subtitle}</span>
						</div>
						<h2 className="onovo-title-2">
                            <span dangerouslySetInnerHTML={{__html: Data.title}} />
						</h2>
					</div>

					{/* Blog swiper */}
					<div className="onovo-blog-carousel">
                        <Swiper
                            {...sliderProps.blogSlider}
                            className="swiper-container js-blog-carousel"
                        >       
                            {posts.slice(0, Data.numOfItems).map((item, key) => (
                            <SwiperSlide key={`bs-slide-${key}`} className="swiper-slide" data-swiper-autoplay>
                                <div className="onovo-blog-slide-item">
                                    <div className="image" data-onovo-overlay data-onovo-scroll>
                                        <Link href={`/blog/${item.id}`}>
                                            <img src={item.image} alt={item.title} />
                                        </Link>
                                    </div>
                                    <div className="desc">
                                        <div className="date">
                                            <Link href={`/blog/${item.id}`} data-splitting><Date dateString={item.date} /></Link>
                                        </div>
                                        <h5 className="title">
                                            <Link href={`/blog/${item.id}`} data-splitting>{item.title}</Link>
                                        </h5>
                                        <div className="text">
                                            <div data-splitting>
                                                <p>{item.short}<br />
                                                    <Link href={`/blog/${item.id}`} className="onovo-btn onovo-hover-btn">
                                                        <span>Read more</span>
                                                    </Link>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                            ))}
                        

                            {/* navs */}
                            <div className="onovo-navs">
                                <div className="onovo-navs-box js-blog-carousel-navs">
                                    <div className="onovo-prev js-blog-carousel-prev onovo-hover-2">
                                        <i />
                                    </div>
                                    <div className="onovo-paginations-container">
                                        <div className="onovo-paginations js-blog-pagination" />
                                        <div className="swiper-nav-active" />
                                    </div>
                                    <div className="onovo-next js-blog-carousel-next onovo-hover-2">
                                        <i />
                                    </div>
                                </div>
                            </div>
                        </Swiper>

					</div>

				</div>
			</section>
        </>
    );
};

export default LatestPostsSlider;