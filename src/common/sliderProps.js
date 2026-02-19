import SwiperCore from "swiper";
import {
  A11y,
  Autoplay,
  EffectCreative,
  EffectFade,
  Grid,
  HashNavigation,
  History,
  Keyboard,
  Mousewheel,
  Navigation,
  Pagination,
  Scrollbar,
  Thumbs,
  Virtual,
} from "swiper/modules";

SwiperCore.use([
  Mousewheel,
  Pagination,
  Navigation,
  EffectFade,
  Autoplay,
  Grid,
  EffectCreative,
  Virtual,
  Pagination,
  HashNavigation,
  History,
  Thumbs,
  Scrollbar,
  Keyboard,
  A11y,
]);

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export const sliderProps = {
  hero2Slider: {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: true,
    speed: 1200,
    parallax: true,
    autoplay: {
      delay: 6000
    },
    grabCursor: false,
    watchSlidesProgress: true,
    pagination: {
      el: '.js-hero-pagination',
      type: 'bullets',
      clickable: true,
    },
    navigation: {
      nextEl: '.js-hero-slider-next',
      prevEl: '.js-hero-slider-prev',
    },
    onSlideChange: function(swiper){
      let current_pos = swiper.el.querySelector('.swiper-pagination-bullet-active').offsetLeft;
      swiper.el.querySelector('.swiper-nav-active').style.left = current_pos+'px';
    },
    onProgress: function(swiper){
      for (var i = 0; i < swiper.slides.length; i++) {
        var slideProgress = swiper.slides[i].progress, innerOffset = swiper.width * 0.5, innerTranslate = slideProgress * innerOffset;
        swiper.slides[i].querySelector('.image').style.transform = "translateX(" + innerTranslate + "px)";
      }
    },
    onTouchStart: function(swiper){
      for (var i = 0; i < swiper.slides.length; i++) {
        swiper.slides[i].style.transition = "";
      }
    },
    onSetTransition: function(swiper, speed){
      for (var i = 0; i < swiper.slides.length; i++) {
        swiper.slides[i].style.transition = speed + "ms";
        swiper.slides[i].querySelector('.image').style.transition = speed + "ms";
      }
    },
    onAfterInit: function(swiper){
      let allImages = swiper.el.querySelectorAll('.image');
      allImages.forEach(element => {
        let img_d = element.dataset.dimg;
        let img_m = element.dataset.mimg;
        if ( window.innerWidth < 768 ) {
          if ( img_m != undefined) {
            element.style.backgroundImage = 'url('+img_m+')';
          }
          else {
            element.style.backgroundImage = 'url('+img_d+')';
          }
        } else {
          if ( img_d != undefined ) {
            element.style.backgroundImage = 'url('+img_d+')';
          }
        }
      });
    },
  },
  hero3Slider: {
    slidesPerView: 'auto',
    loop: false,
    centeredSlides: true,
    rewind: true,
    noSwipingSelector: 'a',
		preventInteractionOnTransition: true,
    mousewheel: false,
    autoplay: {
      delay: 6000
    },
    spaceBetween: 20,
    pagination: false,
    navigation: {
      nextEl: '.js-hero-carousel-next',
      prevEl: '.js-hero-carousel-prev',
    },
    onSlideChangeEnd:function(swiper){
      swiper.update(true);
    },
  },
  hero4Slider: {
    slidesPerView: 1,
    spaceBetween: 0,
    speed: 800,
    autoplay: {
      delay: 6000,
    },
    parallax: true,
    loop: false,
    touchReleaseOnEdges: true,
    threshold: 0,
    touchStartPreventDefault: false,
    touchStartForcePreventDefault: false,
    mousewheel: {
      releaseOnEdges: true
    },
    noSwipingSelector: 'a',
    direction: "vertical",
    pagination: {
      el: '.js-hero-parallax-pagination',
      type: 'bullets',
      clickable: true,
    },
    navigation: {
      nextEl: '.js-hero-parallax-next',
      prevEl: '.js-hero-parallax-prev',
    },
    onSlideChange: function(swiper){
      let current_pos = swiper.el.querySelector('.swiper-pagination-bullet-active').offsetTop;
      swiper.el.querySelector('.swiper-nav-active').style.top = current_pos+'px';
    },
    onAfterInit: function(swiper){
      let current_pos = swiper.el.querySelector('.swiper-pagination-bullet-active').offsetTop;
      swiper.el.querySelector('.swiper-nav-active').style.top = current_pos+'px';
      swiper.el.querySelector('.onovo-paginations-container-vertical').style.opacity = 1;

      let allImages = swiper.el.querySelectorAll('.image');
      allImages.forEach(element => {
        let img_d = element.dataset.dimg;
        let img_m = element.dataset.mimg;
        if ( window.innerWidth < 768 ) {
          if ( img_m != undefined) {
            element.style.backgroundImage = 'url('+img_m+')';
          }
          else {
            element.style.backgroundImage = 'url('+img_d+')';
          }
        } else {
          if ( img_d != undefined ) {
            element.style.backgroundImage = 'url('+img_d+')';
          }
        }
      });
    },
  },
  tickerSlider: {
    spaceBetween: 30,
		centeredSlides: true,
		speed: 12000,
		autoplay: {
			delay: 0,
		},
		loop: true,
		slidesPerView: 'auto',
		allowTouchMove: false,
  },
  testimonialSlider: {
    slidesPerView: 1,
    effect: 'fade',
    loop: false,
    autoplay: false,
    spaceBetween: 50,
    pagination: false,
    navigation: {
      nextEl: '.js-reviews-carousel-next',
      prevEl: '.js-reviews-carousel-prev',
    }
  },
  historySlider: {
    slidesPerView: 1,
    noSwipingSelector: 'a',
    watchSlidesProgress: true,
    loop: false,
    autoplay: false,
    spaceBetween: 20,
    pagination: {
      el: '.js-history-pagination',
      type: 'bullets',
      clickable: true,
    },
    navigation: {
      nextEl: '.js-history-next',
      prevEl: '.js-history-prev',
    },
    onSlideChange: function(swiper) {
      let current_pos = swiper.el.querySelector('.swiper-pagination-bullet-active').offsetLeft;
      swiper.el.querySelector('.swiper-nav-active').style.left = current_pos+'px';
    }
  },
  blogSlider: {
    slidesPerView: 2,
    noSwipingSelector: 'a',
    watchSlidesProgress: true,
    loop: false,
    autoplay: {
      delay: 6000
    },
    spaceBetween: 20,
    pagination: {
      el: '.js-blog-pagination',
      type: 'bullets',
      clickable: true,
    },
    navigation: {
      nextEl: '.js-blog-carousel-next',
      prevEl: '.js-blog-carousel-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 1
      },
      1024: {
        slidesPerView: 2,
      }
    },
    onSlideChange: function(swiper) {
      var current_pos = swiper.el.parentNode.querySelector('.swiper-pagination-bullet-active').offsetLeft;
      swiper.el.parentNode.querySelector('.swiper-nav-active').style.left = current_pos+'px';
    }
  },
};
