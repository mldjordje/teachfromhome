import { useState } from 'react';

import PageBanner from "@components/PageBanner";
import Layouts from "@layouts/Layouts";
import Link from "next/link";

import { getSortedServicesData } from "@library/services";

import Services2Section from "@components/sections/Services2";
import CountersSection from "@components/sections/Counters";
import VideoSection from "@components/sections/Video";
import CallToActionSection from "@components/sections/CallToAction";
import PartnersSection from "@components/sections/Partners";

const Services = (props) => {

  return (
    <Layouts>
      <PageBanner pageTitle={"Our Services"} pageDesc={"Our values and vaulted us to the top of our industry."} />

      <Services2Section introHidden noPaddingBottom />

      <CountersSection />

      <VideoSection />

      {/* Onovo Services */}
	  <section className="onovo-section gap-top-140 gap-bottom-140">
		<div className="container">

			{/* Heading */}
			<div className="onovo-heading gap-bottom-40">
				<div className="onovo-subtitle-1">
					<span>What we do</span>
				</div>
				<h2 className="onovo-title-2">
					<span>We’re a full-service agency</span>
				</h2>
			</div>

			{/* Services items */}
			<div className="onovo-services-list">
				{props.services.map((item, key) => (
				<div key={`services-item-${key}`} className="onovo-service-item-list">
					<div className="onovo-service-item-list-inner">
						<div className="image onovo-hover-1">
							<Link href={`/services/${item.id}`}>
								<img src={item.icon} alt={item.title} />
							</Link>
						</div>
						<div className="num">
							<span> 0{key+1}. </span>
						</div>
						<h5 className="title">
							<Link href={`/services/${item.id}`}>
								<span>{item.title}</span>
							</Link>
						</h5>
						<div className="onovo-text">
							<div>
								<p>{item.short}</p>
							</div>
						</div>
					</div>
				</div>
				))}

			</div>
			
		</div>
	  </section>
      
      <CallToActionSection />

      <PartnersSection paddingTop />
      
    </Layouts>
  );
};
export default Services;

export async function getStaticProps() {
  const allServices = getSortedServicesData();

  return {
    props: {
      services: allServices
    }
  }
}