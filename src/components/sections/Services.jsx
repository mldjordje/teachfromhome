import Data from "@data/sections/services.json";
import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "@components/i18n/LanguageProvider";

import { servicesHover } from "@common/utilits";

const ServicesSection = () => {
  const { language } = useLanguage();

  const pick = (item, key) =>
    language === "en"
      ? (item[`${key}_en`] ?? item[key] ?? item[`${key}_sr`] ?? "")
      : (item[`${key}_sr`] ?? item[key] ?? item[`${key}_en`] ?? "");

  useEffect(() => {
    servicesHover();
  }, []);

  return (
    <>
        {/* Onovo Services */}
        <section className="onovo-section gap-top-140 gap-bottom-140">
            <div className="container-xl">

                {/* Services items */}
                <div className="row onovo-services-grid-fw">
                    {Data.items.map((item, key) => (
                    <div key={`services-item-${key}`} className="col-xs-12 col-sm-12 col-md-6 col-lg-4 align-center">
                        <div className={key == 1 ? "onovo-service-grid-item onovo-hover-1 active active--default" : "onovo-service-grid-item onovo-hover-1"}>
                            <div className="image">
                                <Link href={item.link}>
                                    <img decoding="async" src={item.image} alt={item.title} />
                                </Link>
                            </div>
                            <h5 className="onovo-title-3">
                                <a href={item.link}>
                                    <span>{pick(item, "title")}</span>
                                </a>
                            </h5>
                            <div className="onovo-text">
                                <div>
                                    <p>{pick(item, "text")}</p>
                                </div>
                            </div>
                            <div className="onovo-bubble">
                                <div className="bubble-1" />
                                <div className="bubble-2" />
                                <div className="bubble-3" />
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

export default ServicesSection;
