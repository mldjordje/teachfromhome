import React from "react";
import { useEffect } from "react";
import dynamic from "next/dynamic";

import { circleText } from "@common/utilits";

import ServicesSection from "@components/sections/Services";
import AboutSection from "@components/sections/About";
import CountersSection from "@components/sections/Counters";
import CallToActionSection from "@components/sections/CallToAction";

const Hero4Slider = dynamic(() => import("@components/sliders/Hero4"), { ssr: false });
const TestimonialSlider = dynamic(() => import("@components/sliders/Testimonial"), { ssr: false });

const TeachFromHomeLanding = () => {
  useEffect(() => {
    circleText();
  }, []);

  return (
    <>
      <div id="home" className="tfh-anchor-section">
        <Hero4Slider />
      </div>
      <div id="why-join" className="tfh-anchor-section">
        <ServicesSection />
      </div>
      <div id="about-job" className="tfh-anchor-section">
        <AboutSection />
      </div>
      <div id="earnings" className="tfh-anchor-section">
        <CountersSection />
      </div>
      <div id="process" className="tfh-anchor-section">
        <TestimonialSlider />
      </div>
      <div id="apply" className="tfh-anchor-section">
        <CallToActionSection />
      </div>
    </>
  );
};

export default TeachFromHomeLanding;
