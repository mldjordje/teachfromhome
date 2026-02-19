import Layouts from "@layouts/Layouts";
import Link from "next/link";

import { getAllPostsIds, getPostData, getSortedPostsData } from "@library/posts";
import Date from '@library/date';
import ImageView from "@components/ImageView";

import { useRouter } from 'next/router';

import PageBanner from "@components/PageBanner";

import {
  FacebookShareButton,
  LinkedinShareButton,
  PinterestShareButton,
  RedditShareButton,
  TwitterShareButton
} from "react-share";

const PostsDetail = ( props ) => {
  
  const postData = props.data;
  let prev_id, next_id, prev_key, next_key = 0;

  props.posts.forEach(function(item, key){
    if ( item.id == postData.id ) {
      prev_key = key - 1;
      next_key = key + 1;
    }
  })

  props.posts.forEach(function(item, key){
    if ( key == prev_key ) {
      prev_id = item.id;
    }
    if ( key == next_key ) {
      next_id = item.id;
    }
  });

  const { asPath } = useRouter();
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : '';
  const shareUrl = `${origin}${asPath}`;
  console.log(shareUrl);

  return (
    <Layouts>
      <PageBanner pageTitle={postData.title} pageDesc={""} />

      {/* Onovo Blog Detail */}
			<section className="onovo-section onovo-post gap-top-140">
				<div className="container">

					{/* Image */}
					<div className="onovo-post-pic" data-onovo-overlay data-onovo-scroll>
						<img src={postData.image} alt={postData.title} />
					</div>

					{/* Post*/}
					<div className="onovo-post-wrapper">
						<div className="onovo-post-content">

							{/* Date */}
							<div className="onovo-post-date">
								<span className="date"><Date dateString={postData.date} /></span> by <a href="#" onClick={(e) => {e.preventDefault();}}>{postData.author.name}</a>
							</div>

							{/* Content */}
							<div className="onovo-post-text">
								<div className="post-content">
                  <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />

                  {typeof postData.gallery != "undefined" &&
                  <>
                    {postData.gallery.enabled == 1 &&
                      <div className="row gap-row mb-5">
                          {postData.gallery.items.map((item, key) => (
                          <div key={`gallery-item-${key}`} className={ postData.gallery.cols == 3 ? "col-xs-12 col-sm-12 col-md-6 col-lg-4" : "col-xs-12 col-sm-12 col-md-6 col-lg-6"}>
                              <a className="mfp-image" href={item.image}>
                                <img src={item.image} alt={item.alt} />
                              </a>
                          </div>
                          ))}
                      </div>
                    }
                  </>
                  }

									{typeof postData.additional != "undefined" &&
                  <>
                    {postData.additional.enabled == 1 &&
                    <div dangerouslySetInnerHTML={{ __html: postData.additional.content }} />
                    }
                  </>
                  }
								</div>
							</div>

							{/* Info */}
							<div className="onovo-post-bottom">
								<div className="onovo-post-bottom-content">

									{/* Categories */}
									<div className="onovo-post-categories onovo-lnk lnk--white">
										<span>Posted in: </span>
										<a href="#" onClick={(e) => {e.preventDefault();}}>{postData.category}</a>
									</div>

									{/* Tags */}
									<div className="onovo-post-tags">
										<span>Tags: </span>
										<a href="#" onClick={(e) => {e.preventDefault();}}>branding</a>
										<a href="#" onClick={(e) => {e.preventDefault();}}>design</a>
										<a href="#" onClick={(e) => {e.preventDefault();}}>development</a>
										<a href="#" onClick={(e) => {e.preventDefault();}}>web</a>
									</div>

									{/* Social*/}
									<div className="social-share onovo-post-socials onovo-social-2">
										<span>Share:</span>
										<ul>
                      <li>
                        <FacebookShareButton 
                          className="onovo-social-link onovo-hover-2"
                          url={shareUrl}
                          quote={postData.title}
                          hashtag={'#'+postData.category}
                        >
                          <i className="icon fab fa-facebook" />
                        </FacebookShareButton>
                      </li>
                      <li>
                        <TwitterShareButton 
                          className="onovo-social-link onovo-hover-2"
                          url={shareUrl}
                          title={postData.title}
                          hashtag={'#'+postData.category}
                        >
                          <i className="icon fab fa-twitter"></i>
                        </TwitterShareButton>
                      </li>
                      <li>
                        <LinkedinShareButton 
                          className="onovo-social-link onovo-hover-2"
                          url={shareUrl}
                          title={postData.title}
                          summary={postData.type}
                          source={shareUrl}
                        >
                          <i className="icon fab fa-linkedin" />
                        </LinkedinShareButton>
                      </li>
                      <li>
                        <RedditShareButton 
                          className="onovo-social-link onovo-hover-2"
                          url={shareUrl}
                          title={postData.title}
                        >
                          <i className="icon fab fa-reddit" />
                        </RedditShareButton>
                      </li>
                      <li>
                        <PinterestShareButton 
                          className="onovo-social-link onovo-hover-2"
                          url={shareUrl}
                          media={postData.image}
                          description={postData.title}
                        >
                          <i className="icon fab fa-pinterest" />
                        </PinterestShareButton>
                      </li>
										</ul>
									</div>

								</div>
							</div>

							{/* Navigation */}
							<div className="onovo-page-navigation">
								<div className="onovo-page-navigation-content">
                  {prev_id != 0 && prev_id != undefined &&
                  <Link href={`/blog/${prev_id}`} className="page-navigation__prev">
										<span className="onovo-prev onovo-hover-2">
											<i />
										</span>
									</Link>
                  }
									<Link href="/blog" className="page-navigation__posts">
										<i className="fas fa-th" />
									</Link>
                  {next_id != 0 && next_id != undefined &&
									<Link href={`/blog/${next_id}`} className="page-navigation__next">
										<span className="onovo-next onovo-hover-2">
											<i />
										</span>
									</Link>
                  }
								</div>
							</div>

						</div>
					</div>

					{/* Post Comments */}
					<div className="onovo-post-comments">

						{/* Comments */}
						<div id="comments" className="comment post-sb__comment">

							{/* Title */}
							<div className="comment__title"> 2 Comments </div>

							{/* Comments items */}
							<ul className="comments comment__wrapper">

								{/*comment item*/}
								<li className="comment comment-item">
									<div className="comment">
										<div className="comment-item__photo">
											<img src="https://secure.gravatar.com/avatar/7255da11246c78e93500291c48c8f7a4?s=64&#038;d=mm&#038;r=g" className="avatar photo" height="64" width="64" alt="" />
										</div>
										<div className="comment-item__content">
											<div className="comment-item__top">
												<div className="comment-item__name">Lisa Brown</div>
												<div className="comment-item__sent">April 2, 2023</div>
											</div>
											<div className="comment-item__text">
												<p>We are actively engaging with waste to energy operators, concrete manufacturers, and the wider construction industry.</p>
											</div>
											<div className="comment-item__reply">
												<a className="comment-reply-link" href="#" onClick={(e) => {e.preventDefault();}}>Reply</a>
											</div>
										</div>
									</div>
								</li>

								{/*comment item*/}
								<li className="comment comment-item">
									<div className="comment">
										<div className="comment-item__photo">
											<img src="https://secure.gravatar.com/avatar/7255da11246c78e93500291c48c8f7a4?s=64&#038;d=mm&#038;r=g" className="avatar photo" height="64" width="64" alt="" />
										</div>
										<div className="comment-item__content">
											<div className="comment-item__top">
												<div className="comment-item__name">Sofia Morrison</div>
												<div className="comment-item__sent">April 2, 2023</div>
											</div>
											<div className="comment-item__text">
												<p>Most innovative and successful builders and real estate enterprises in the country, has been selected for the design-build expansion of Airsides A and E at Tampa International Airport.</p>
											</div>
											<div className="comment-item__reply">
												<a className="comment-reply-link" href="#" onClick={(e) => {e.preventDefault();}}>Reply</a>
											</div>
										</div>
									</div>
								</li>

							</ul>

						</div>

						{/* Comments Form */}
						<div className="post-sb__comment-form comment-form">
							<div id="respond" className="comment-respond">
								<div className="comment__title">Leave a comment</div>
								<form id="commentform" className="comment-form" onSubmit={(e) => {e.preventDefault();}}>
									<div className="field comment-form__field">
										<textarea className="textarea" rows="3" placeholder="Comment" name="comment"></textarea>
									</div>
									<div className="comment-form__inputs-group">
										<div className="comment-form__field-wrapper">
											<label className="field comment-form__field">
												<input name="author" type="text" placeholder="Name" className="input" />
											</label>
										</div>
										<div className="comment-form__field-wrapper">
											<label className="field comment-form__field">
												<input name="email" type="text" placeholder="Email" className="input" />
											</label>
										</div>
									</div>
									<button type="submit" className="onovo-btn onovo-hover-btn">
										<span>Submit</span>
									</button>
								</form>
							</div>
						</div>

					</div>

				</div>
			</section>
      
      <ImageView />
    </Layouts>
  );
};
export default PostsDetail;

export async function getStaticPaths() {
    const paths = getAllPostsIds()

    return {
      paths,
      fallback: false
    }
}

export async function getStaticProps({ params }) {
    const postData = await getPostData(params.id)
    const allPosts = await getSortedPostsData(params.id)

    return {
      props: {
        data: postData,
        posts: allPosts
      }
    }
}