import Link from "next/link";
import appData from "@data/app.json";
import { useEffect } from "react";
import ImageView from "@components/ImageView";
import { footerSticky } from "@common/utilits";

const Footer2 = () => {
  useEffect(() => {
    footerSticky();
  }, []);

  return (
    <>
      {/* Footer */}
      <footer className="onovo-footer footer--white">
        <div className="footer--default">
          <div className="container">
            <div className="row gap-bottom-40">
              <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                {/* Heading */}
                <div className="onovo-heading">
                  <h2 className="onovo-title-2">
                    <span>Start Teaching English Online with TeachFromHome</span>
                  </h2>
                  <p>
                    <Link href="/contact" className="onovo-footer-lnk onovo-lnk lnk--revert">
                      Apply Now
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="row gap-bottom-40">
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-2">
                {/* Logo */}
                <div className="onovo-f-logo gap-bottom-40" style={{ maxWidth: "70px" }}>
                  <Link href="/">
                    <img src={appData.footer.logo.image} alt={appData.footer.logo.alt} />
                  </Link>
                </div>
              </div>
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-3">
                {/* Description */}
                <div className="onovo-text">
                  Remote teaching opportunity with flexible hours, international students, and long-term growth.
                </div>
              </div>
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-3 offset-lg-1">
                {/* Description */}
                <div className="onovo-text">
                  <ul className="onovo-footer-menu">
                    <li>
                      <Link href="/#why-join">
                        <span className="onovo-lnk">Why Join</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/#about-job">
                        <span className="onovo-lnk">About Job</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/#process">
                        <span className="onovo-lnk">Process</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact">
                        <span className="onovo-lnk">Apply</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-2">
                {/* Description */}
                <div className="onovo-text">
                  TeachFromHome.app
                  <p>
                    <a className="onovo-lnk" href="mailto:info@teachfromhome.app" target="_blank" rel="noreferrer">
                      info@teachfromhome.app
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 align-self-center">
                {/* Copyright */}
                <div className="copyright">
                  <div dangerouslySetInnerHTML={{ __html: appData.footer.copy }} />
                </div>
              </div>
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 align-right">
                {/* Social*/}
                <div className="onovo-social-1 onovo-social-active">
                  <ul>
                    {appData.social.map((item, key) => (
                      <li key={`fsocial-item-${key}`}>
                        <a className="onovo-social-link onovo-hover-2" href={item.link} title={item.title} target="_blank" rel="noreferrer">
                          <i className={item.icon} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <ImageView />
    </>
  );
};
export default Footer2;
