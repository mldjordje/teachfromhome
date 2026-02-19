import Link from "next/link";
import usePagination from '@library/usePagination.js'

export const dotts = '...'

const Pagination = ({ currentPage, totalItems, perPage, renderPageLink }) => {
    const pages = usePagination(totalItems, currentPage, perPage)

    return (
        <div className="pager">
            {currentPage > 1 &&
            <Link key="pagination-item-prev" href={currentPage > 1 ? renderPageLink( currentPage - 1 ) : renderPageLink( currentPage )} className="prev page-numbers onovo-prev onovo-hover-2"><i className="icon-arrow" /></Link>
            }

            {pages.map((pageNumber, i) =>
                pageNumber === dotts ? (
                <span
                    key={`pagination-item-${i}`}
                    className="page-numbers"
                >
                    {pageNumber}
                </span>
                ) : (
                <Link
                    key={`pagination-item-${i}`}
                    href={renderPageLink(pageNumber)}
                    className={`${
                    pageNumber === currentPage ? 'current' : ''
                    } page-numbers`}
                    style={{"marginLeft": "2px", "marginRight": "2px"}}
                >
                    {pageNumber}
                </Link>
                )
            )}

            {currentPage < pages.length &&
            <Link key="pagination-item-next" href={currentPage < pages.length ? renderPageLink( currentPage + 1 ) : renderPageLink( currentPage )} className="next page-numbers onovo-next onovo-hover-2"><i className="icon-arrow" /></Link>
            }
        </div>
    );
  };
  export default Pagination;