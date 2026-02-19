import Data from "@data/sections/team.json";
import Link from "next/link";

const TeamSection = ( { team } ) => {
    return (
        <>
            {/* Onovo Team */}
			<section className="onovo-section gap-top-140 gap-bottom-140">
				<div className="container">

					{/* Heading */}
					<div className="onovo-heading align-center gap-bottom-40">
						<div className="onovo-subtitle-1">
							<span>{Data.subtitle}</span>
						</div>
						<h2 className="onovo-title-2">
							<span dangerouslySetInnerHTML={{__html: Data.title}} />
						</h2>
					</div>

					{/* Team items */}
					<div className="row gap-row">

                        {team.slice(0, Data.numOfItems).map((item, key) => (
						<div key={`team-item-${key}`} className="col-xs-12 col-sm-12 col-md-6 col-lg-3">
							<div className="onovo-team" data-onovo-overlay data-onovo-scroll>
								<div className="onovo-team-item onovo-hover-3">
									<div className="desc">
										<h5 className="title">
											<Link href={`/team/${item.id}`} className="onovo-lnk">
												<span data-splitting data-onovo-scroll>{item.name}</span>
											</Link>
										</h5>
										<div className="onovo-subtitle-1">
											<span data-splitting data-onovo-scroll>{item.role}</span>
										</div>
										<div className="onovo-social-1">
											<ul>
                                                {item.social.map((link, link_key) => (
												<li key={`team-item-${key}-social-link-${link_key}`}>
													<a className="onovo-social-link onovo-hover-2" href={link.link} title={link.title} target="_blank">
														<i aria-hidden="true" className={link.icon} />
													</a>
												</li>
												))}
											</ul>
										</div>
									</div>
									<div className="image">
										<Link href={`/team/${item.id}`}>
											<img decoding="async" src={item.image} width="350" height="530" alt={item.name} />
										</Link>
									</div>
									<div className="num onovo-text-white">
										<span>{item.first_letter}</span>
									</div>
								</div>
							</div>
						</div>
                        ))}

					</div>
					
				</div>
			</section>
        </>
    );
};

export default TeamSection;