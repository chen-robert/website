import "material-icons";
import "typeface-open-sans";
import "styles/main.less";

import $ from "jquery";
import data from "data";

import timeline from "./timeline";
import timelineUtils from "./timelineUtils";

$(function() {
  Object.keys(data).forEach(key => {
    $("#content").prepend(timeline(key, data[key].name));

    const $rootElem = $(`#${key}`);
    const events = data[key].events;

    timelineUtils.create($rootElem, events);
  });
  
  const checkScroll = () => {
    const scrollPos = $(document).scrollTop();
    
    if(scrollPos != 0){
      $("#header").addClass("scrolled");
    }else{
      $("#header").removeClass("scrolled");
    }

    $(".viewable").each((i, elem) => {
      if (scrollPos + $(window).height() > $(elem).offset().top) {
        $(elem).addClass("viewed");
      }
    });
  }
  $(window).scroll(checkScroll);
  
  checkScroll();
});
