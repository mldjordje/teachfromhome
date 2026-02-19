import Layouts from "@layouts/Layouts";
import Accordion from "react-bootstrap/Accordion";

import PageBanner from "@components/PageBanner";
import CallToActionSection from "@components/sections/CallToAction";

const FAQ = () => {
  const content = {
    items: [
      {
        heading: "Who can apply?",
        content:
          "Fluent English speakers from Serbia with professional communication skills, stable internet, and a quiet teaching setup."
      },
      {
        heading: "How many attempts are allowed?",
        content:
          "You can have up to three attempts in each phase. Feedback is provided so you can improve before the next submission."
      },
      {
        heading: "What happens after Phase 1?",
        content:
          "Candidates who pass Phase 1 are moved to Phase 2, where they watch training materials and submit an additional video attempt."
      },
      {
        heading: "How fast can I start teaching?",
        content:
          "After final approval, new teachers can typically begin teaching in around two days."
      }
    ]
  };

  return (
    <Layouts>
      <PageBanner
        pageTitle={"TeachFromHome FAQ"}
        pageDesc={"Answers about application, onboarding, and starting to teach online."}
      />

      {/* Onovo Faq */}
      <section className="onovo-section gap-top-140 gap-bottom-140">
        <div className="container">
          {/* Faq items */}
          <Accordion>
            <div className="onovo-faq-items">
              {content.items.map((item, key) => (
                <Accordion.Item key={`faq-item-${key}`} eventKey={`faq-acc-${key}`}>
                  <div className="onovo-faq-item onovo-collapse-item">
                    <Accordion.Header>
                      <h5 className="title onovo-collapse-btn">
                        <span>{item.heading}</span>
                        <i className="arrow" />
                      </h5>
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="onovo-text">
                        <div dangerouslySetInnerHTML={{ __html: item.content }} />
                      </div>
                    </Accordion.Body>
                  </div>
                </Accordion.Item>
              ))}
            </div>
          </Accordion>
        </div>
      </section>

      <CallToActionSection />
    </Layouts>
  );
};
export default FAQ;
