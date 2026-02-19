import Layouts from "@layouts/Layouts";

import PageBanner from "@components/PageBanner";
import PricingSection from "@components/sections/Pricing"
import CallToActionSection from "@components/sections/CallToAction";
import PartnersSection from "@components/sections/Partners";

const Pricing = () => {
  return (
    <Layouts contactButton cartButton>
      <PageBanner pageTitle={"Pricing Plans"} pageDesc={"It helps you choose prices to maximise."} />
      
      <PricingSection hiddenHeading />

      <CallToActionSection />

      <PartnersSection paddingTop />

    </Layouts>
  );
};
export default Pricing;