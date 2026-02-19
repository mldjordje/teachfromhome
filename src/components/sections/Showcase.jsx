import Data from "@data/sections/showcase.json";
import Link from "next/link";
import { useEffect } from "react";

import { showcaseHover } from "@common/utilits";

const ShowcaseSection = ( { projects } ) => {
	useEffect(() => {
		showcaseHover();
	}, []);

    return (
        <>
            {/* Onovo Showcase */}
			<section className="onovo-section gap-bottom-140" style={{"borderBottom": "1px solid #555"}}>
				<div className="container">

					{/* Heading */}
					<div className="onovo-heading gap-bottom-40">
						<div className="onovo-subtitle-1">
							<span>{Data.subtitle}</span>
						</div>
						<h2 className="onovo-title-2">
							<span>{Data.title}</span>
						</h2>
					</div>

					{/* Showcase */}
					<div className="onovo-showcase gap-bottom-40">
						<div className="img-circle onovo-circle-move" />

						{/* Showcase items */}
						<div className="onovo-showcase-items">
                            {projects.slice(0, Data.numOfItems).map((item, key) => (
							<div key={`showcase-item-${key}`} className="onovo-showcase-item">
								<div className="category">
									<a href={`/projects/${item.id}`}>
										<span data-splitting data-onovo-scroll>
											<span>{item.category}</span>
										</span>
									</a>
								</div>
								<h3 className="title">
									<a href={`/projects/${item.id}`}>
										<span className="onovo-lnk" data-splitting data-onovo-scroll>{item.title}</span>
									</a>
								</h3>
								<div className="image" data-onovo-overlay data-onovo-scroll>
									<span className="img" style={{"backgroundImage": "url(" + item.image + ")"}} />
								</div>
							</div>
                            ))}
						</div>
                        
					</div>

					{/* Button */}
					<Link className="onovo-btn onovo-hover-btn" href={Data.button.link}>
						<i className="arrow">
							<span />
						</i>
						<span>{Data.button.label}</span>
					</Link>

				</div>
			</section>
        </>
    );
};

export default ShowcaseSection;