import Data from "@data/sections/call-to-action-2.json";
import appData from "@data/app.json";
import { Formik } from 'formik';

const CallToAction2Section = () => {
  return (
    <>
        {/* Onovo CTA-2 */}
        <section className="onovo-section gap-top-140 gap-bottom-140">
            <div className="container" style={{"backgroundImage": "url("+Data.bg_image+")", "backgroundPosition": "65% 0%", "backgroundRepeat": "no-repeat", "backgroundSize": "contain"}}>
                <div className="row">
                    <div className="col-xs-12 col-sm-12 col-md-12 col-lg-6 align-self-center gap-bottom-40">

                        {/* Heading */}
                        <div className="onovo-heading gap-bottom-40">
                            <div className="onovo-subtitle-1">
                                <span>{Data.subtitle}</span>
                            </div>
                            <h2 className="onovo-title-2">
                                <span dangerouslySetInnerHTML={{__html: Data.title}} />
                            </h2>
                        </div>

                        {/* Text */}
                        <div className="onovo-cta-2-text" dangerouslySetInnerHTML={{__html: Data.text}} />

                        {/* Social*/}
                        <div className="onovo-social-1">
                            <ul>
                                {Data.social.map((item, key) => (
                                <li key={`cta-social-item-${key}`}>
                                    <a className="onovo-social-link onovo-hover-2" href={item.link} title={item.title} target="_blank">
                                        <i className={item.icon} />
                                    </a>
                                </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                    <div className="col-xs-12 col-sm-12 col-md-12 col-lg-5 offset-lg-1">

                        {/* Onovo Form */}
                        <div className="onovo-form-box onovo-text-white">
                            <h5>Send Us A Message</h5>
                            <p>Feel some love, to see what we can do...t!</p>
                            <Formik
                            initialValues = {{ email: '', name: '', tel: '', message: '' }}
                            validate = { values => {
                                const errors = {};
                                if (!values.email) {
                                    errors.email = 'Required';
                                } else if (
                                    !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)
                                ) {
                                    errors.email = 'Invalid email address';
                                }
                                return errors;
                            }}
                            onSubmit = {( values, { setSubmitting } ) => {
                                const form = document.getElementById("contactForm");
                                const status = document.getElementById("contactFormStatus");
                                const data = new FormData();

                                data.append('name', values.name);
                                data.append('tel', values.tel);
                                data.append('email', values.email);
                                data.append('message', values.message);

                                fetch(form.action, {
                                    method: 'POST',
                                    body: data,
                                    headers: {
                                        'Accept': 'application/json'
                                    }
                                }).then(response => {
                                    if (response.ok) {
                                        status.innerHTML = "Thanks for your submission!";
                                        form.reset()
                                    } else {
                                        response.json().then(data => {
                                            if (Object.hasOwn(data, 'errors')) {
                                                status.innerHTML = data["errors"].map(error => error["message"]).join(", ")
                                            } else {
                                                status.innerHTML = "Oops! There was a problem submitting your form"
                                            }
                                        })
                                    }
                                }).catch(error => {
                                    status.innerHTML = "Oops! There was a problem submitting your form"
                                });

                                setSubmitting(false);
                            }}
                            >
                            {({
                                values,
                                errors,
                                touched,
                                handleChange,
                                handleBlur,
                                handleSubmit,
                                isSubmitting,
                                /* and other goodies */
                            }) => (
                            <form onSubmit={handleSubmit} id="contactForm" action={appData.settings.formspreeURL} className="cform" method="post">
                                <div className="row">
                                    <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                        <p>
                                            <input 
                                              size="40" 
                                              placeholder="Full Name" 
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
                                              size="40" 
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
                                              size="40" 
                                              placeholder="Phone" 
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
                                              cols="40" 
                                              rows="10" 
                                              placeholder="Message" 
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
                                            <button type="submit" className="onovo-btn onovo-hover-btn btn--active">
                                                <span>Send Message</span>
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
                </div>
            </div>
        </section>
    </>
  );
};

export default CallToAction2Section;