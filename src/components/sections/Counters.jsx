import Data from "@data/sections/counters.json";
import CountUp from 'react-countup';
import { useLanguage } from "@components/i18n/LanguageProvider";

const CountersSection = () => {
  const { language } = useLanguage();

  const pick = (item, key) =>
    language === "en"
      ? (item[`${key}_en`] ?? item[key] ?? item[`${key}_sr`] ?? "")
      : (item[`${key}_sr`] ?? item[key] ?? item[`${key}_en`] ?? "");

  return (
    <>
      {/* Onovo Numbers */}
		<section className="onovo-section gap-top-140 gap-bottom-140">
			<div className="container">

				{/* Numbers items */}
				<div className="row">
					{Data.items.map((item, key) => (
					<div key={`counters-item-${key}`} className="col-xs-12 col-sm-12 col-md-4 col-lg-4 align-center">
						<div className="onovo-counter">
							<div className="num onovo-text-white js-counter">
								<CountUp end={item.value} duration={7} enableScrollSpy={true} scrollSpyOnce={true} />
							</div>
							{pick(item, "after") != '' &&
							<div className="num-after onovo-text-white">{pick(item, "after")}</div>
							}
							<div className="label">{pick(item, "label")}</div>
						</div>
					</div>
					))}
				</div>
				
			</div>
		</section>
    </>
  );
};

export default CountersSection;
