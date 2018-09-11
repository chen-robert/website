import "styles/main.less";
import "material-icons";

import $ from "jquery";
import data from "data";

const PAGE_HEIGHT = 500;
const PAGE_OFFSET = 100;

import timeline from "./timeline";
import timelineUtils from "./timelineUtils";

$(function() {
  Object.keys(data).forEach(key => {
    $("#content").prepend(timeline(key, data[key].name));

    const $rootElem = $(`#${key}`);
    const events = data[key].events;

    timelineUtils.create($rootElem, events);
  });

  $(window).scroll(() => {
    const scrollPos = $(document).scrollTop();

    $(".scrollable").each((i, elem) => {
      if (!$(elem).hasClass("last") && scrollPos > 3 * PAGE_OFFSET + (i) * PAGE_HEIGHT) {
        $(elem).addClass("scrolled");
      } else {
        $(elem).removeClass("scrolled");
      }

      if (scrollPos > (i-1) * PAGE_HEIGHT + 3 * PAGE_OFFSET) {
        $(elem).addClass("viewed");
      }
    });
  });

  $(".scrollable").each((i, elem) =>
    $(elem).css(
      "margin-top",
      `${i * PAGE_HEIGHT + (i == 0 ? 0 : PAGE_OFFSET)}px`
    )
  );
  $(".scrollable").each((i, elem) =>
    $(elem).css("z-index", `${$(".scrollable").length - i}`)
  );
});
