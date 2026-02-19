import Layouts from "@/src/layouts/Layouts";

const E404 = () => {
  return (
    <Layouts darkHeader noFooter>
      <div className="page-404">
        <div className="container page-404__container">
          <div className="page-404__num">404</div>
          <h3 className="page-404__title">Page not found</h3>
          <div className="page-404__text onovo-text">We are unable to find the page you are looking for.</div>
          
          <form role="search" method="get" className="search-form" action="https://onovo.bslthemes.com/" onSubmit={(e) => {e.preventDefault();}}>
            <label>
              <span className="screen-reader-text">Search for:</span>
              <input type="search" className="search-field" placeholder="Search …" name="s" />
            </label>
            <input type="submit" className="search-submit" value="Search" />
          </form>
        </div>
      </div>
    </Layouts>
  );
};
export default E404;
