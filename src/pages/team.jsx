import PageBanner from "@components/PageBanner";
import Layouts from "@layouts/Layouts";
import Link from "next/link";

import { getSortedTeamData } from "@library/team";

import CallToActionSection from "@components/sections/CallToAction";
import PartnersSection from "@components/sections/Partners"

const Team = ( props ) => {
  return (
    <Layouts>
		<PageBanner pageTitle={"Our Team"} pageDesc={"Meet our creativity company family."} />

		{/* Onovo Team */}
		<section className="onovo-section gap-top-140 gap-bottom-140">
			<div className="container">

				{/* Team items */}
				<div className="row gap-row align-center">

					{props.team.map((item, key) => (
					<div key={`team-item-${key}`} className="col-xs-12 col-sm-12 col-md-6 col-lg-3">
						<div className="onovo-team-two">
							<div className="onovo-team-two-item">
								<div className="image onovo-hover-3 onovo-hover-black-30" data-onovo-overlay data-onovo-scroll>
									<Link href={`/team/${item.id}`}>
										<img src={item.image} alt={item.name} />
									</Link>
									<div className="onovo-social-2">
										<ul>
											{item.social.map((link, link_key) => (
											<li key={`team-item-${key}-link-${link_key}`}>
												<a key={`teamsocial-item-${link_key}`} className="onovo-social-link onovo-hover-2" href={link.link} title={link.title} target="_blank">
													<i aria-hidden="true" className={link.icon} />
												</a>
											</li>
											))}
										</ul>
									</div>
								</div>
								<div className="desc">
									<h5 className="title">
										<Link href={`/team/${item.id}`} className="onovo-lnk">
											<span data-splitting data-onovo-scroll>{item.name}</span>
										</Link>
									</h5>
									<div className="onovo-subtitle-1">
										<span data-splitting data-onovo-scroll>{item.role}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					))}

					{/* Button */}
					<div className="col-xs-12 col-sm-12 col-md-6 col-lg-3 align-center align-self-center">
						<Link className="onovo-btn-circle onovo-hover-2" href={'/contact'}>
							<i className="arrow">
								<span />
							</i>
						</Link>
					</div>

				</div>
				
			</div>
		</section>

		<CallToActionSection />

		<PartnersSection paddingTop />

    </Layouts>
  );
};
export default Team;

export async function getStaticProps() {
  const allTeam = getSortedTeamData();

  return {
    props: {
      team: allTeam
    }
  }
}