import { PER_PAGE } from './blog/page/[page]'
import PaginatedBlog from '@components/PaginatedBlog'
import Pagination from '@components/Pagination'

import PageBanner from "@components/PageBanner";
import Layouts from "@layouts/Layouts";

import { getPaginatedPostsData } from "@library/posts";

const Blog = ( { posts, totalPosts, currentPage } ) => {
  return (
    <Layouts>
      <PageBanner pageTitle={"News & Blog"} pageDesc={"Insights, thoughts, industry trends, marketing tips."} />

      {/* Onovo Blog */}
			<div className="onovo-blog gap-top-140">
				<div className="container">
          {/* Blog items */}
					<div className="row">
            <PaginatedBlog
              items={posts}
            />
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={totalPosts}
            perPage={PER_PAGE}
            renderPageLink={(page) => `/blog/page/${page}`}
          />
        </div>
      </div>
      
    </Layouts>
  );
};
export default Blog;

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