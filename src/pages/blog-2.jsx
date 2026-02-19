import { PER_PAGE } from './blog/page/[page]'
import Link from "next/link";
import Date from '@library/date';

import PageBanner from "@components/PageBanner";
import Layouts from "@layouts/Layouts";

import { getPaginatedPostsData } from "@library/posts";

const Blog2 = ( { posts, totalPosts, currentPage } ) => {
  return (
    <Layouts>
      <PageBanner pageTitle={"News & Blog"} pageDesc={"Insights, thoughts, industry trends, marketing tips."} />

      {/* Onovo Blog List */}
			<div className="onovo-blog onovo-archive gap-top-140">
				<div className="container">
					<div className="row archive-row">
						<div className="col-lg-8">

              {posts.map((item, key) => (
							<div className="onovo-blog-item archive-item" key={`post-${key}`}>
								<div className="image" data-onovo-overlay data-onovo-scroll>
									<a href={`/blog/${item.id}`}>
										<img src={item.image} alt={item.title} />
									</a>
								</div>
								<div className="desc">
									<div className="info">
										<div className="date"><Date dateString={item.date} /></div>
                    {item.category}
									</div>
									<h3 className="title">
										<Link href={`/blog/${item.id}`}>{item.title}</Link>
									</h3>
									<div className="onovo-text">
										<p>
                      {item.short} <br />
											<Link href={`/blog/${item.id}`} className="onovo-btn onovo-hover-btn">
												<span>Read more</span>
											</Link>
										</p>
									</div>
								</div>
							</div>
              ))}

							{/* pager */}
							<div className="pager">
								<span aria-current="page" className="page-numbers current">1</span>
								<a className="page-numbers" href="#" onClick={(e) => {e.preventDefault();}}>2</a>
								<a className="next page-numbers onovo-next onovo-hover-2" href="#" onClick={(e) => {e.preventDefault();}}><i className="icon-arrow" /></a>
							</div>

						</div>
						<div className="col-lg-4">

							{/* Sidebar */}
							<div className="col-sidebar">
								<div className="content-sidebar">

									{/*widget*/}
									<div className="widget widget_search">
										<form className="wp-block-search" onSubmit={(e) => {e.preventDefault();}}>
											<div className="wp-block-search__inside-wrapper">
												<input type="search" className="wp-block-search__input" placeholder="Search" />
												<button type="submit" className="wp-block-search__button">Search</button>
											</div>
										</form>
									</div>

									{/*widget*/}
									<div className="widget">
										<h2>Recent Posts</h2>
										<ul className="wp-block-latest-posts__list wp-block-latest-posts">
											<li>
												<div className="wp-block-latest-posts__featured-image">
													<img src="/images/posts3-150x150.jpg" alt="image" />
												</div>
												<Link className="wp-block-latest-posts__post-title" href="/blog/play-to-your-strength-and-supercharge-your-business">Usability Secrets to Create Interfaces</Link>
												<span className="wp-block-latest-posts__post-date">March 25, 2023</span>
											</li>
											<li>
												<div className="wp-block-latest-posts__featured-image">
													<img src="/images/post1-150x150.jpg" alt="image" />
												</div>
												<Link className="wp-block-latest-posts__post-title" href="/blog/play-to-your-strength-and-supercharge-your-business">The Main Thing For The Web Designer</Link>
												<span className="wp-block-latest-posts__post-date">March 18, 2023</span>
											</li>
											<li>
												<div className="wp-block-latest-posts__featured-image">
													<img src="/images/post4-150x150.jpg" alt="image" />
												</div>
												<Link className="wp-block-latest-posts__post-title" href="/blog/play-to-your-strength-and-supercharge-your-business">How to Do Your First Business Project</Link>
												<span className="wp-block-latest-posts__post-date">March 10, 2023</span>
											</li>
										</ul>
									</div>
									
									{/*widget*/}
									<div className="widget">
										<h2>Recent Comments</h2>
										<ol className="wp-block-latest-comments">
											<li className="wp-block-latest-comments__comment">
												<span className="wp-block-latest-comments__comment-author">Lisa Brown</span> on 
												<Link className="wp-block-latest-comments__comment-link" href="/blog/play-to-your-strength-and-supercharge-your-business">Strength to Strength within the Business Solutions</Link>
											</li>
											<li className="wp-block-latest-comments__comment">
												<span className="wp-block-latest-comments__comment-author">Alex Ferguson</span> on 
												<Link className="wp-block-latest-comments__comment-link" href="/blog/play-to-your-strength-and-supercharge-your-business">Strength to Strength within the Business Solutions</Link>
											</li>
											<li className="wp-block-latest-comments__comment">
												<span className="wp-block-latest-comments__comment-author">Sofia Morrison</span> on 
												<Link className="wp-block-latest-comments__comment-link" href="/blog/play-to-your-strength-and-supercharge-your-business">Usability Secrets to Create Interfaces</Link>
											</li>
											<li className="wp-block-latest-comments__comment">
												<span className="wp-block-latest-comments__comment-author">Lisa Brown</span> on 
												<Link className="wp-block-latest-comments__comment-link" href="/blog/play-to-your-strength-and-supercharge-your-business">Usability Secrets to Create Interfaces</Link>
											</li>
										</ol>
									</div>

									{/*widget*/}
									<div className="widget">
										<h2 className="wp-block-heading">Archives</h2>
										<ul className="wp-block-archives-list wp-block-archives">
											<li>
												<a href="#" onClick={(e) => {e.preventDefault();}}>March 2023</a>&nbsp;(3)
											</li>
											<li>
												<a href="#" onClick={(e) => {e.preventDefault();}}>February 2023</a>&nbsp;(2)
											</li>
											<li>
												<a href="#" onClick={(e) => {e.preventDefault();}}>January 2023</a>&nbsp;(2)
											</li>
											<li>
												<a href="#" onClick={(e) => {e.preventDefault();}}>December 2022</a>&nbsp;(1)
											</li>
										</ul>
									</div>

									{/*widget*/}
									<div className="widget">
										<h2 className="wp-block-heading">Categories</h2>
										<ul className="wp-block-categories-list wp-block-categories">
											<li className="cat-item">
												<a href="#" onClick={(e) => {e.preventDefault();}}>Branding</a> (2)
											</li>
											<li className="cat-item">
												<a href="#" onClick={(e) => {e.preventDefault();}}>Design</a> (3)
											</li>
											<li className="cat-item">
												<a href="#" onClick={(e) => {e.preventDefault();}}>News</a> (3)
											</li>
										</ul>
									</div>

									{/*widget*/}
									<div className="widget">
										<h2>Tags</h2>
										<p className="wp-block-tag-cloud">
											<a href="#" onClick={(e) => {e.preventDefault();}} className="tag-cloud-link">branding</a>
											<a href="#" onClick={(e) => {e.preventDefault();}} className="tag-cloud-link">design</a>
											<a href="#" onClick={(e) => {e.preventDefault();}} className="tag-cloud-link">development</a>
											<a href="#" onClick={(e) => {e.preventDefault();}} className="tag-cloud-link">it</a>
											<a href="#" onClick={(e) => {e.preventDefault();}} className="tag-cloud-link">technology</a>
											<a href="#" onClick={(e) => {e.preventDefault();}} className="tag-cloud-link">web</a>
										</p>
									</div>

								</div>
							</div>

						</div>
					</div>
				</div>
			</div>
      
    </Layouts>
  );
};
export default Blog2;

export async function getStaticProps() {
  const { posts, total } = getPaginatedPostsData( PER_PAGE, 1 );

  return {
    props: {
      posts,
      totalPosts: total,
      currentPage: 1
    }
  }
}