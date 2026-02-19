import Head from 'next/head';
import Link from "next/link";
import appData from "@data/app.json";
import { useRouter } from 'next/router';

const PageBanner = ({ pageTitle, pageDesc }) => {
  const headTitle = `${appData.settings.siteName} - ${pageTitle}`;
  const { asPath } = useRouter();

  return (
    <>
      <Head>
        <title>{headTitle}</title>
      </Head>
      {/* Onovo Intro */}
			<section className="onovo-section onovo-intro intro--black">
				<div className="container">
					<h1 className="onovo-title-1  onovo-text-white">
						<span>{pageTitle}</span>
						<span className="onovo-sep word">
							<i className="sep-img" style={{"backgroundImage": "url(/images/title_icon.svg)"}} />
						</span>
					</h1>
					{pageDesc != "" &&
					<div className="onovo-subtitle-2  onovo-text-white">
						<span>{pageDesc}</span>
					</div>
					}
					<div className="onovo-breadcrums">
						<ul>
							<li>
								<Link href="/">Home</Link>
							</li>
							{asPath.indexOf('/blog/') != -1 &&
							<li>
								<Link href="/blog">Blog</Link>
							</li>
							}
							{asPath.indexOf('/projects/') != -1 &&
							<li>
								<Link href="/projects">Projects</Link>
							</li>
							}
							{asPath.indexOf('/services/') != -1 &&
							<li>
								<Link href="/services">Services</Link>
							</li>
							}
							{asPath.indexOf('/team/') != -1 &&
							<li>
								<Link href="/team">Team</Link>
							</li>
							}
							<li className="current">
								<span>{pageTitle}</span>
							</li>
						</ul>
					</div>
				</div>
			</section>
    </>
  );
};
export default PageBanner;
