import "material-icons";
import "typeface-open-sans";
import "styles/main.less";

import $ from "jquery";
import data from "data";

import timelineElem from "./timeline";
import hobbyDescElem from "./hobbyDesc";
import timelineUtils from "./timelineUtils";

$(function() {
  Object.keys(data.timeline).forEach(key => {
    $("#content").prepend(timelineElem(key, data[key].name));

    const $rootElem = $(`#${key}`);
    const events = data[key].events;

    timelineUtils.create($rootElem, events);
  });

  const checkScroll = () => {
    const scrollPos = $(document).scrollTop();

    if (scrollPos != 0) {
      $("#header").addClass("scrolled");
    } else {
      $("#header").removeClass("scrolled");
    }

    if(scrollPos != 0){
      $(".viewable").each((i, elem) => {
        if (scrollPos + $(window).height() > $(elem).offset().top) {
          $(elem).addClass("viewed");
        }
      });
    }
  };
  $(window).scroll(checkScroll);

  checkScroll();

  data.hobbies.forEach(hobby => {
    $("#hobbies").append(hobbyDescElem(hobby));
  });
});
