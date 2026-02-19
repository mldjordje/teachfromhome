import PaginatedBlog from '@components/PaginatedBlog'
import Pagination from '@components/Pagination'

import PageBanner from "@components/PageBanner";
import Layouts from "@layouts/Layouts";

import { getPaginatedPostsData } from "@library/posts";

export const PER_PAGE = 9

const Blog = ( { posts, currentPage, totalPosts } ) => {

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

export async function getStaticPaths() {
    return {
        paths: Array.from({ length: 5 }).map((_, i) => `/blog/page/${i + 2}`),
        fallback: 'blocking',
    }
}

export async function getStaticProps( { params } ) {
    const page = Number(params?.page) || 1
    const { posts, total } = getPaginatedPostsData( PER_PAGE, page );
  
    if (!posts.length) {
      return {
        notFound: true,
      }
    }
  
    if (page === 1) {
      return {
        redirect: {
          destination: '/blog',
          permanent: false,
        },
      }
    }
  
    return {
      props: {
        posts,
        totalPosts: total,
        currentPage: page,
      },
      revalidate: 60 * 60 * 24, // <--- ISR cache: once a day
    }
}