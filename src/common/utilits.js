// Header Sticky
export const headerSticky = () => {
  let new_scroll_position = 0;
  let last_scroll_position;
  const header = document.querySelector(".onovo-header");

  window.addEventListener('scroll', function(e) {
    last_scroll_position = window.scrollY;

    // Scrolling down
    if (new_scroll_position < last_scroll_position && last_scroll_position > 50) {
      header.classList.remove("slideDown");
      header.classList.add("slideUp");
      header.classList.add("sticky");
    }
    else if (last_scroll_position < 50) {
        header.classList.remove("slideDown");
        header.classList.remove("sticky");
    } 
    else if (new_scroll_position > last_scroll_position) {
        header.classList.remove("slideUp");
        header.classList.add("slideDown");
        header.classList.add("sticky");
    }

    new_scroll_position = last_scroll_position;
  });
}

// Footer Sticky
export const footerSticky = () => {
  const footerFixed = document.querySelector(".footer--fixed .onovo-footer");
  const wrapper = document.querySelector(".wrapper");
  let footerHeight = footerFixed.offsetHeight;
  
	wrapper.style.marginBottom = footerHeight+'px';
};

// Services Hover
export const servicesHover = () => {
  const items = document.querySelectorAll('.onovo-service-grid-item');
  const itemActive = document.querySelector(".onovo-service-grid-item.active--default");

  items.forEach((item) => {
    item.addEventListener("mouseover", (e) => {
      items.forEach((item) => {
        item.classList.remove('active');
      });
      item.classList.add('active');
    });
    item.addEventListener("mouseleave", (e) => {
      items.forEach((item) => {
        item.classList.remove('active');
      });
      itemActive.classList.add('active');
    });
  });
}

// Circle Text
export const circleText = () => {
  const labels = document.querySelectorAll('.onovo-circle-text .label');

  labels.forEach((item) => {
    
    if ( !item.classList.contains('loaded') ) {
      let itemText = item.innerHTML;
      item.innerHTML = itemText.split('').map((char, i) => `<span style="transform:rotate(${i * 8.5}deg)">${char}</span>`).join('');
      item.classList.add('loaded');
    }
  });
}

// Portfolio Showcase Hover
export const showcaseHover = () => {
  let firstItem = document.querySelector('.onovo-showcase-item:first-child')
  firstItem.classList.add('hover');
  let items = document.querySelectorAll('.onovo-showcase-item');

  items.forEach((item) => {
    item.addEventListener("mouseenter", (e) => {
      items.forEach((item) => {
        item.classList.remove('hover');
      });
      item.classList.add('hover');
    });
  });
}

// Services Showcase Hover
export const servShowcaseHover = () => {
  let firstItem = document.querySelector('.onovo-services-showcase .items ul li:first-child')
  firstItem.classList.add('hover');
  let items = document.querySelectorAll('.onovo-services-showcase .items ul li');

  items.forEach((item) => {
    item.addEventListener("mouseenter", (e) => {
      items.forEach((item) => {
        item.classList.remove('hover');
      });
      item.classList.add('hover');
    });
  });
}

// Words Wrap
export const wordsWrap = () => {
  const allWrap = document.querySelectorAll(".word");
  allWrap.forEach((item) => {
      if ( !item.parentNode.classList.contains('span') ) {
      let wrapper = document.createElement('span');
      wrapper.classList.add('span');
      item.parentNode.insertBefore(wrapper, item);
      wrapper.appendChild(item);
      }
  });
}

// Overlay Animation
export const overlayAnim = () => {
  const allOverlays = document.querySelectorAll("[data-onovo-overlay]");
  allOverlays.forEach((item) => {
      let overlay = document.createElement("div");
      overlay.classList.add('onovo-overlay');
      item.appendChild(overlay);
  });
}