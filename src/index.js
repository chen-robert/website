import "styles/main.less"

import $ from "jquery";

const PAGE_HEIGHT = 250;
const PAGE_OFFSET = 100;

$(function(){
  $(window).scroll(() => {
    const scrollPos = $(document).scrollTop();
    
    $(".scrollable").each((i, elem) => {
      if(!$(elem).hasClass("last") && scrollPos > (i + 1) * PAGE_HEIGHT){
        $(elem).addClass("scrolled");
      }else{
        $(elem).removeClass("scrolled");
      }
      
      if(scrollPos > (i) * PAGE_HEIGHT){
        $(elem).addClass("viewed");
      }
    });
  });
  
  $(".scrollable").each((i, elem) => $(elem).css("margin-top", `${i * PAGE_HEIGHT + (i == 0? 0: PAGE_OFFSET)}px`));
  $(".scrollable").each((i, elem) => $(elem).css("z-index", `${$(".scrollable").length - i}`));
});