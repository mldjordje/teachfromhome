import PageBanner from "@components/PageBanner";
import Layouts from "@layouts/Layouts";
import Accordion from "react-bootstrap/Accordion";
import appData from "@data/app.json";
import { Formik } from "formik";

const Contact = () => {
  const faqData = {
    title: "Application FAQ / Cesta pitanja",
    subtitle: "How TeachFromHome <br/>Recruitment Works",
    items: [
      {
        title: "What is included in Phase 1?",
        text: "Phase 1 includes your basic profile details and a short introduction video where you demonstrate clear communication and accent quality."
      },
      {
        title: "How does Phase 2 work?",
        text: "After passing Phase 1, you get training video materials and an assigned sentence. You submit your Phase 2 video attempt for review."
      },
      {
        title: "How many attempts do I have?",
        text: "You can have up to three attempts in each phase. Feedback is provided so you can improve between retries."
      },
      {
        title: "When can I start teaching?",
        text: "Approved candidates can usually start in around two days after the final review and onboarding confirmation."
      }
    ]
  };

  return (
    <Layouts>
      <PageBanner
        pageTitle={"Apply to TeachFromHome"}
        pageDesc={"Submit your application and start your remote English teaching journey."}
      />

      {/* Onovo Contact Info */}
      <section className="onovo-section gap-top-140">
        <div className="container">
          <div className="row">
            <div className="col-xs-12 col-sm-12 col-md-12 col-lg-7">
              {/* Heading */}
              <div className="onovo-text gap-bottom-40">
                <h4>Start Your Application</h4>
                Fill out the form below. Our team reviews applications daily.
              </div>

              {/* Form */}
              <div className="onovo-form">
                <Formik
                  initialValues={{ email: "", name: "", tel: "", message: "" }}
                  validate={(values) => {
                    const errors = {};
                    if (!values.email) {
                      errors.email = "Required";
                    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
                      errors.email = "Invalid email address";
                    }
                    return errors;
                  }}
                  onSubmit={(values, { setSubmitting }) => {
                    const form = document.getElementById("contactForm");
                    const status = document.getElementById("contactFormStatus");
                    const data = new FormData();

                    data.append("name", values.name);
                    data.append("tel", values.tel);
                    data.append("email", values.email);
                    data.append("message", values.message);

                    fetch(form.action, {
                      method: "POST",
                      body: data,
                      headers: {
                        Accept: "application/json"
                      }
                    })
                      .then((response) => {
                        if (response.ok) {
                          status.innerHTML = "Thanks, your application request has been submitted.";
                          form.reset();
                        } else {
                          response.json().then((dataObj) => {
                            if (Object.hasOwn(dataObj, "errors")) {
                              status.innerHTML = dataObj.errors.map((error) => error.message).join(", ");
                            } else {
                              status.innerHTML = "There was a problem submitting your form.";
                            }
                          });
                        }
                      })
                      .catch(() => {
                        status.innerHTML = "There was a problem submitting your form.";
                      });

                    setSubmitting(false);
                  }}
                >
                  {({ values, handleChange, handleBlur, handleSubmit }) => (
                    <form onSubmit={handleSubmit} id="contactForm" action={appData.settings.formspreeURL} className="cform" method="post">
                      <div className="row">
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                          <p>
                            <input
                              placeholder="First and Last Name"
                              type="text"
                              name="name"
                              required="required"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.name}
                            />
                          </p>
                        </div>
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                          <p>
                            <input
                              placeholder="Email Address"
                              type="email"
                              name="email"
                              required="required"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.email}
                            />
                          </p>
                        </div>
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                          <p>
                            <input
                              placeholder="Phone Number"
                              type="tel"
                              name="tel"
                              required="required"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.tel}
                            />
                          </p>
                        </div>
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                          <p>
                            <textarea
                              placeholder="Tell us briefly about your availability and teaching experience"
                              name="message"
                              required="required"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.message}
                            />
                          </p>
                        </div>
                        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                          <p>
                            <button type="submit" className="onovo-btn onovo-hover-btn">
                              <span>Submit Application</span>
                            </button>
                          </p>
                        </div>
                      </div>

                      <div className="form-status alert-success" id="contactFormStatus" />
                    </form>
                  )}
                </Formik>
              </div>
            </div>
            <div className="col-xs-12 col-sm-12 col-md-12 col-lg-5">
              {/* Contact Info */}
              <div className="onovo-contact-info onovo-text-white">
                <ul>
                  <li>
                    <h5>Contact</h5>
                    <a href="mailto:info@teachfromhome.app" className="onovo-lnk lnk--white" target="_blank" rel="noreferrer">
                      info@teachfromhome.app
                    </a>

                    <div className="onovo-social-1 onovo-social-active" style={{ marginTop: "10px" }}>
                      <ul>
                        {appData.social.map((item, key) => (
                          <li key={`contact-social-item-${key}`}>
                            <a href={item.link} target="_blank" rel="noreferrer" className="onovo-social-link onovo-hover-2" title={item.title}>
                              <i className={`icon ${item.icon}`} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                  <li>
                    <h5>Response Time</h5>
                    <div>Applications are reviewed every day. Selected candidates move to the next step quickly.</div>
                  </li>
                  <li>
                    <h5>Phase Overview</h5>
                    <div>Phase 1: Intro video review. Phase 2: Training materials plus final video attempt.</div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onovo Faq */}
      <section className="onovo-section gap-top-140">
        <div className="container">
          {/* Heading */}
          <div className="onovo-heading align-center gap-bottom-40">
            <div className="onovo-subtitle-1">
              <span>{faqData.title}</span>
            </div>
            <h2 className="onovo-title-2">
              <span dangerouslySetInnerHTML={{ __html: faqData.subtitle }} />
            </h2>
          </div>

          {/* Faq items */}
          <div className="onovo-faq-items">
            <Accordion defaultActiveKey="faq-acc-0">
              {faqData.items.map((item, key) => (
                <Accordion.Item key={`faq-item-${key}`} eventKey={`faq-acc-${key}`}>
                  <div className="onovo-faq-item onovo-collapse-item">
                    <Accordion.Header>
                      <h5 className="title onovo-collapse-btn">
                        <span>{item.title}</span>
                        <i className="arrow" />
                      </h5>
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="onovo-text">
                        <div dangerouslySetInnerHTML={{ __html: item.text }} />
                      </div>
                    </Accordion.Body>
                  </div>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </Layouts>
  );
};

export default Contact;
