import Link from "next/link";
import Isotope from "isotope-layout";
import { useEffect, useRef, useState } from "react";
import appData from "@data/app.json";
import ImageView from "@components/ImageView";

const ProjectsGrid = ({ projects, layout, cols, sideFilter, masonry, galleryMode }) => {
  // Isotope
  const isotope = useRef();
  const [filterKey, setFilterKey] = useState("*");

  useEffect(() => {
    setTimeout(() => {
      isotope.current = new Isotope(".onovo-portfolio-items", {
        itemSelector: ".onovo-portfolio-col",
        percentPosition: true,
        masonry: {
          columnWidth: ".onovo-portfolio-col",
        },
        animationOptions: {
          duration: 750,
          easing: "linear",
          queue: false,
        },
      });
    }, 1000);

    let filterNavActive = document.querySelectorAll('.onovo-filter-nav-active');

    filterNavActive.forEach((item) => {
		item.style.width = item.parentNode.querySelector('.item--active').parentNode.offsetWidth+6+'px';
	});
  }, []);

  useEffect(() => {
    if (isotope.current) {
      filterKey === "*"
        ? isotope.current.arrange({ filter: `*` })
        : isotope.current.arrange({ filter: `.${filterKey}` });
    }
  }, [filterKey]);

  const handleFilterKeyChange = (key) => () => {
    setFilterKey(key);
    const filterLinks = document.querySelectorAll(".js-onovo-filter li");

    filterLinks.forEach((filter) => {
      const filterValue = filter.querySelector('button').getAttribute("data-filter");
      if (filterValue == key) {
        filter.querySelector('button').classList.add("item--active");
      } else {
        filter.querySelector('button').classList.remove("item--active");
      }
    });

    const activeItem = document.querySelector('.onovo-filter.filter--default .item--active');
    const activeFilterNav = document.querySelector('.onovo-filter.filter--default .onovo-filter-nav-active');

    if ( activeFilterNav != undefined ) {
        let current_pos = activeItem.parentNode.offsetLeft;
        let current_width = activeItem.parentNode.offsetWidth;
        
        activeFilterNav.style.width = current_width+6+'px';
        activeFilterNav.style.left = current_pos-3+'px';
    }
  };

  let columns = '';

  switch ( cols ) {
    case "1" : columns = 'col-xs-12 col-sm-12 col-md-12 col-lg-12'; break;
    case "2" : columns = 'col-xs-12 col-sm-12 col-md-6 col-lg-6'; break;
    case "3" : columns = 'col-xs-12 col-sm-12 col-md-6 col-lg-4'; break;
    default: columns = 'col-xs-12 col-sm-12 col-md-6 col-lg-6';
  }

  if ( layout == "list" ) {
    columns = 'col-xs-12 col-sm-12 col-md-12 col-lg-12';
  }

  return (
    <>
      {/* Onovo Projects */}
      <section className="onovo-section gap-top-140">
        <div className="container">

          {/* Projects Grid */}
          <div className={sideFilter ? "onovo-portfolio portfolio--side" : "onovo-portfolio"}>
            <div className="row">
                <div className={!sideFilter ? "col-xs-12 col-sm-12 col-md-12 col-lg-12" : "col-xs-12 col-sm-12 col-md-12 col-lg-3"}>

                    {/* Filter projects */}
                    <div className="onovo-filter-container">
                        <div className={!sideFilter ? "onovo-filter js-onovo-filter filter--default" : "onovo-filter js-onovo-filter"}>
                            {!sideFilter &&
                            <div className="onovo-filter-nav-active" />
                            }
                            <ul>
                                <li key={`categories-item-first`}>
                                    <button onClick={handleFilterKeyChange("*")} className="onovo-filter-item item--active" type="button" data-filter="*">
                                        <span>All Projects</span>
                                    </button>
                                </li>
                                {appData.settings.portfolio.categories.map((item, key) => (
                                <li key={`categories-item-${key}`}>
                                    <button onClick={handleFilterKeyChange(item.slug)} className="onovo-filter-item" type="button" data-filter={item.slug}>
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>
                <div className={!sideFilter ? "col-xs-12 col-sm-12 col-md-12 col-lg-12" : "col-xs-12 col-sm-12 col-md-12 col-lg-9"}>

                    {/* Projects items */}
                    <div className="row onovo-portfolio-items">

                        {projects.map((item, key) => (
                        <div key={`projects-item-${key}`} className={`${columns} onovo-portfolio-col ${item.category_slug}`}>
                            {layout == "grid" &&    
                                <div className="onovo-portfolio-item">
                                    <div className={masonry ? "image" : "image image-square"} data-onovo-overlay data-onovo-scroll>
                                        <Link href={galleryMode ? item.image : `/projects/${item.id}`} className="onovo-hover-3">
                                            <img src={item.image} alt={item.title} />
                                        </Link>
                                    </div>
                                    <div className="desc">
                                        <h5 className="title">
                                            <Link className="onovo-lnk" href={galleryMode ? item.image : `/projects/${item.id}`}>
                                                <span data-splitting data-onovo-scroll>{item.title}</span>
                                            </Link>
                                        </h5>
                                        <div className="text">
                                            <div data-splitting data-onovo-scroll>
                                                <span>{item.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                            {layout == "list" &&
                                <div className="onovo-portfolio-item onovo-portfolio-item-list">
                                    <div className="image" data-onovo-overlay data-onovo-scroll>
                                        <Link href={`/projects/${item.id}`} className="onovo-hover-3">
                                          <img src={item.image} alt={item.title} />
                                        </Link>
                                    </div>
                                    <div className="desc">
                                      <div className="text">
                                        <div data-splitting data-onovo-scroll>
                                          <span>{item.category}</span>
                                        </div>
                                      </div>
                                      <h5 className="title">
                                        <Link className="onovo-lnk" href={`/projects/${item.id}`}>
                                          <span data-splitting data-onovo-scroll>{item.title}</span>
                                        </Link>
                                      </h5>
                                      <div className="onovo-text">
                                        <div>
                                          <ul data-splitting="" data-onovo-scroll="">
                                            <li key={`projects-list-item-${key}-attr-1`}>
                                              <strong>Project Type</strong>
                                              <br /> {item.type}
                                            </li>
                                            <li key={`projects-list-item-${key}-attr-2`}>
                                              <strong>Team</strong>
                                              <br /> {item.team}
                                            </li>
                                            <li key={`projects-list-item-${key}-attr-3`}>
                                              <strong>Date</strong>
                                              <br /> {item.date}
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                </div>
                            }
                        </div>
                        ))}

                    </div>

                </div>
            </div>
          </div>
            
        </div>
      </section>

      <ImageView />
    </>
  );
};
export default ProjectsGrid;
