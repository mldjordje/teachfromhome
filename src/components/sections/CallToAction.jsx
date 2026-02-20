import Data from "@data/sections/call-to-action.json";
import Link from "next/link";
import { useLanguage } from "@components/i18n/LanguageProvider";

const CallToActionSection = () => {
  const { language } = useLanguage();

  const pick = (item, key) =>
    language === "en"
      ? (item[`${key}_en`] ?? item[key] ?? item[`${key}_sr`] ?? "")
      : (item[`${key}_sr`] ?? item[key] ?? item[`${key}_en`] ?? "");

  return (
    <>
        {/* Onovo CTA */}
        <section className="onovo-section gap-top-140 gap-bottom-140" style={{"backgroundImage": "url("+Data.bg_image+")", "backgroundPosition": "center center", "backgroundRepeat": "no-repeat", "backgroundSize": "cover"}}>
            <div className="container">
                <div className="row">
                    <div className="col-xs-12 col-sm-12 col-md-12 col-lg-6">

                        {/* Heading */}
                        <div className="onovo-heading gap-bottom-40 onovo-text-white">
                            <div className="onovo-subtitle-1">
                                <span>{pick(Data, "subtitle")}</span>
                            </div>
                            <h2 className="onovo-title-2">
                                <span dangerouslySetInnerHTML={{__html: pick(Data, "title")}} />
                            </h2>
                        </div>

                        {/* Text */}
                        <div className="onovo-cta-text" dangerouslySetInnerHTML={{__html: pick(Data, "text")}} />
                            
                    </div>
                    <div className="col-xs-12 col-sm-12 col-md-12 col-lg-6">

                        {/* Social */}
                        <div className="onovo-cta-social">
                            <div className="image" style={{"backgroundImage": "url("+ Data.bg_image2 +")"}}>
                                <div className="cta-img-circle img-circle--1" />
                                <div className="cta-img-circle img-circle--2" />
                                <div className="cta-img-circle img-circle--3" />
                            </div>
                            <div className="desc">
                                <ul>
                                    {Data.social.map((item, key) => (
                                    <li key={`cta-social-item-${key}`}>
                                        {(item.link.startsWith("/") || item.link.startsWith("#")) ? (
                                          <Link className="onovo-btn btn--white btn--large btn--icon onovo-hover-btn" href={item.link}>
                                            <i aria-hidden="true" className={item.icon} />
                                            <span>{pick(item, "title")}</span>
                                          </Link>
                                        ) : (
                                          <a
                                            className="onovo-btn btn--white btn--large btn--icon onovo-hover-btn"
                                            href={item.link}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                          >
                                            <i aria-hidden="true" className={item.icon} />
                                            <span>{pick(item, "title")}</span>
                                          </a>
                                        )}
                                    </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    </>
  );
};

export default CallToActionSection;
