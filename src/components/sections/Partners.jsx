import Data from "@data/sections/partners.json";

const PartnersSection = ( { paddingTop } ) => {
  return (
    <>
        {/* Onovo Brands */}
        <section className={paddingTop ? "onovo-section gap-top-140" : "onovo-section"}>
            <div className="container">

                {/* Heading */}
                <div className="onovo-heading gap-bottom-40">
                    <div className="onovo-subtitle-1">
                        <span dangerouslySetInnerHTML={{__html: Data.subtitle}} />
                    </div>
                    <h2 className="onovo-title-2">
                        <span dangerouslySetInnerHTML={{__html: Data.title}} />
                    </h2>
                </div>

                {/* Brands items */}
                <div className="row gap-row">
                    {Data.items.map((item, key) => (
                    <div key={`partners-item-${key}`} className="col-6 col-xs-6 col-sm-6 col-md-4 col-lg-3">
                        <div className="onovo-brands onovo-hover-3 onovo-hover-label" data-onovo-overlay data-onovo-scroll>
                            <a target="_blank" href={item.link}>
                                <span className="image">
                                    <img decoding="async" src={item.image} width="285" height="200" alt={item.alt} />
                                </span>
                                <span className="label onovo-white-black">Visit Website</span>
                            </a>
                        </div>
                    </div>
                    ))}
                </div>

            </div>
        </section>
    </>
  );
};

export default PartnersSection;