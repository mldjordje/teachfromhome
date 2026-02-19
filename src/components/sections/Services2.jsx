import Data from "@data/sections/services-2.json";
import Link from "next/link";

const Services2Section = ( { introHidden, noPaddingBottom } ) => {
  return (
    <>
        {/* Onovo Services */}
        <section className={noPaddingBottom ? "onovo-section gap-top-140" : "onovo-section gap-top-140 gap-bottom-140"}>
            <div className="container">
                {introHidden == undefined &&
                    <>
                        {/* Heading */}
                        <div className="onovo-heading gap-bottom-40 align-center">
                            <div className="onovo-subtitle-1">
                                <span dangerouslySetInnerHTML={{__html: Data.subtitle}} />
                            </div>
                            <h2 className="onovo-title-2">
                                <span dangerouslySetInnerHTML={{__html: Data.title}} />
                            </h2>
                        </div>

                        {/* Description */}
                        <div className="row gap-bottom-60">
                            <div className="col-xs-12 col-sm-12 col-md-12 col-lg-6 offset-lg-3 align-center">
                                <div className="onovo-text">
                                    <p dangerouslySetInnerHTML={{__html: Data.text}} />
                                    <p><img src={Data.signature.image} alt={Data.signature.alt} /></p>
                                </div>
                            </div>
                        </div>
                    </>
                }

                {/* Services items */}
                <div className="row gap-row">
                    {Data.items.map((item, key) => (
                    <div key={`services2-item-${key}`} className="col-xs-12 col-sm-12 col-md-6 col-lg-4 align-center">
                        <div className="onovo-service-item">
                            <div className="image">
                                <Link href={item.link}>
                                    <img src={item.icon} alt={item.title} />
                                </Link>
                            </div>
                            <div className="onovo-service-item-inner onovo-hover-3 onovo-hover-black">
                                <h5 className="title">
                                    <Link href={item.link}>
                                        <span data-splitting data-onovo-scroll>{item.title}</span>
                                    </Link>
                                </h5>
                                <div className="list">
                                    <ul>
                                        {item.list.map((elem, key2) => (
                                        <li key={`services2-item-${key}-list-element-${key2}`}>
                                            <Link className="onovo-lnk" href={item.link}>
                                                <span data-splitting data-onovo-scroll>{elem}</span>
                                            </Link>
                                        </li>
                                        ))}
                                    </ul>
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

export default Services2Section;