import Layouts from "@layouts/Layouts";
import PageBanner from "@components/PageBanner";
import Link from "next/link";

import { getAllTeamIds, getTeamData } from "@library/team";
import { getFeaturedProjectsData } from "@library/projects";
import { getFeaturedServicesData } from "@library/services";

const TeamDetail = ( { postData, projects, services } ) => {
  return (
    <Layouts>
      <PageBanner pageTitle={postData.name} pageDesc={"Meet our creativity company family."} />

      	{/* Onovo Team Detail */}
		<section className="onovo-section gap-top-140 gap-bottom-140">
			<div className="container">

				{/* Team Card */}
				<div className="onovo-team-detail">
					<div className="row gap-140 gap-top-60 gap-bottom-0">
						<div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
							<img loading="lazy" src={postData.image} className="team-detail-img" alt={postData.name} />
						</div>
						<div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 align-self-center">
							<h2>
								<span data-splitting data-onovo-scroll>{postData.name}</span>
							</h2>
							<h5>
								<span data-splitting data-onovo-scroll>{postData.role}</span>
							</h5>
							{typeof postData.info != "undefined" &&
							<div className="onovo-team-info">
								<ul>
									{postData.info.map((item, key) => (
									<li key={`info-item-${key}`}>
										<div className="title">
											<span data-splitting data-onovo-scroll>{item.label}</span>
										</div>
										<div className="onovo-text">
											<div data-splitting data-onovo-scroll>
												<p>{item.value}</p>
											</div>
										</div>
									</li>
									))}
								</ul>
							</div>
							}
							{typeof postData.social != "undefined" &&
							<div className="onovo-social-1 mb-5">
								<ul>
									{postData.social.map((item, key) => (
									<li key={`teamsocial-item-${key}`}>
										<a className="onovo-social-link onovo-hover-2" href={item.link} title={item.title} target="_blank">
											<i aria-hidden="true" className={item.icon} />
										</a>
									</li>
									))}
								</ul>
							</div>
							}
						</div>
					</div>
				</div>
		
				{postData.contentHtml != "" &&
				<div className="onovo-text gap-top-140">
					<div dangerouslySetInnerHTML={{__html : postData.contentHtml}} />
				</div>
				}


			</div>
		</section>
	
		{typeof postData.services != "undefined" &&
		<section className="onovo-section gap-bottom-140">
			<div className="container">

				{/* Heading */}
				<div className="onovo-heading gap-bottom-40">
					<h5 className="onovo-subtitle-1">
						<span> What we do </span>
					</h5>
				</div>

				{/* Services items */}
				<div className="onovo-services-list">

					{services.map((item, key) => (
					<div key={`services-item-${key}`} className="onovo-service-item-list">
						<div className="onovo-service-item-list-inner">
							<div className="image onovo-hover-1">
								<Link href={`/services/${item.id}`}>
									<img src={item.icon} alt={item.title} />
								</Link>
							</div>
							<div className="num">
								<span>0{key+1}.</span>
							</div>
							<h5 className="title">
								<a href={`/services/${item.id}`}>
									<span>{item.title}</span>
								</a>
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
		}

		{typeof postData.awards != "undefined" &&
		<section className="onovo-section gap-bottom-140">
			<div className="container">

				{/* Heading */}
				<div className="onovo-heading">
					<h5 className="onovo-subtitle-1">
						<span> Awards </span>
					</h5>
				</div>

				{/* Awards items */}
				<div className="row gap-row">

					{postData.awards.map((item, key) => (
					<div key={`awards-item-${key}`} className="col-xs-12 col-sm-12 col-md-4 col-lg-4">
						<p><img src={item.image} alt="image" /></p>
						<h5 className="onovo-title-1">{item.value}</h5>
						<span dangerouslySetInnerHTML={{__html : item.label}} />
					</div>
					))}

				</div>
		
				
			</div>
		</section>
		}

      	{typeof postData.projects != "undefined" &&
		<section className="onovo-section">
			<div className="container">

				{/* Heading */}
				<div className="onovo-heading gap-bottom-40">
					<h5 className="onovo-subtitle-1">
						<span> Work Showcase </span>
					</h5>
				</div>

				{/* Projects items */}
				<div className="onovo-portfolio">
					<div className="row gap-row onovo-portfolio-items">

						{projects.map((item, key) => (
						<div key={`projects-item-${key}`} className="col-xs-12 col-sm-12 col-md-6 col-lg-6 onovo-portfolio-col">
							<div className="onovo-portfolio-item">
								<div className="image" data-onovo-overlay data-onovo-scroll>
									<Link href={`/projects/${item.id}`} className="onovo-hover-3">
										<img src={item.image} alt={item.title} />
									</Link>
								</div>
								<div className="desc">
									<h5 className="title">
										<Link className="onovo-lnk" href={`/projects/${item.id}`}>
											<span data-splitting data-onovo-scroll>{item.title}</span>
										</Link>
									</h5>
									<div className="text">
										<div data-splitting data-onovo-scroll>
											<span>{item.category}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
						))}

					</div>
				</div>
				
			</div>
		</section>
      	}

    </Layouts>
  );
};
export default TeamDetail;

export async function getStaticPaths() {
    const paths = getAllTeamIds()

    return {
      paths,
      fallback: false
    }
}

export async function getStaticProps({ params }) {
    const postData = await getTeamData(params.id)
    const projects = await getFeaturedProjectsData(postData.projects)
    const services = await getFeaturedServicesData(postData.services)
    
    return {
      props: {
        postData,
        projects,
        services
      }
    }
}