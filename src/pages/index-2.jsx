import React from "react";
import Layouts from "@layouts/Layouts";
import dynamic from "next/dynamic";

import { getSortedPostsData } from "@library/posts";
import { getSortedProjectsData } from "@library/projects";
import { getSortedTeamData } from "@library/team";

import Services2Section from "@components/sections/Services2"
import PricingSection from "@components/sections/Pricing"
import Team2Section from "@components/sections/Team2"
import CallToAction2Section from "@components/sections/CallToAction2"
import PartnersSection from "@components/sections/Partners"

const Hero2Slider = dynamic( () => import("@components/sliders/Hero2"), { ssr: false } );
const HistorySlider = dynamic( () => import("@components/sliders/History"), { ssr: false } );
const Testimonial2Slider = dynamic( () => import("@components/sliders/Testimonial2"), { ssr: false } );
const LatestPostsSlider = dynamic( () => import("@components/sliders/LatestPosts"), { ssr: false } );

const ProjectsSection = dynamic( () => import("@components/sections/Projects"), { ssr: false } );

const Home2 = (props) => {
  return (
    <Layouts header={2} footer={2}>
      <>
        <Hero2Slider />
        <Services2Section />
        <HistorySlider />
        <ProjectsSection projects={props.projects} />
        <PricingSection bg={"bg"} />
        <Team2Section team={props.team} />
        <Testimonial2Slider />
        <LatestPostsSlider posts={props.posts} />
        <CallToAction2Section />
        <PartnersSection />
      </>
    </Layouts>
  );
};
export default Home2;

export async function getStaticProps() {
  const allPosts = getSortedPostsData();
  const allProjects = getSortedProjectsData();
  const allTeam = getSortedTeamData();

  return {
    props: {
      posts: allPosts,
      projects: allProjects,
      team: allTeam
    }
  }
}