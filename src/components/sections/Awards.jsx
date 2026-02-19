import Data from "@data/sections/awards.json";

const AwardsSection = () => {
    return (
      <>
        {/* Onovo Awards */}
		<section className="onovo-section gap-bottom-140">
			<div className="container">

				{/* Heading */}
				<div className="onovo-heading">
					<h5 className="onovo-subtitle-1">
                        <span dangerouslySetInnerHTML={{__html : Data.subtitle}} />
					</h5>
				</div>

				{/* Awards items */}
				<div className="row gap-row">

                    {Data.items.map((item, key) => (
					<div key={`awards-item-${key}`} className="col-xs-12 col-sm-12 col-md-4 col-lg-4">
						<p><img src={item.image} alt={item.alt} /></p>
						<h5 className="onovo-title-1">{item.value}</h5>
						<span dangerouslySetInnerHTML={{__html : item.label}} />
					</div>
                    ))}

				</div>
				
			</div>
		</section>
      </>
    );
};

export default AwardsSection;