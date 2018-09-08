import "styles/main.less"
import "material-icons";

import $ from "jquery";

const PAGE_HEIGHT = 350;
const PAGE_OFFSET = 100;

const TIMELINE_BUTTON_DELTA = 350;

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
  
  const baseline = 1514838949 * 1000;
  const events = [{
    date: 1527539700 * 1000,
    text: "PACTF",
    desc: "Placed 3rd."
  },{
    date: 1538265600 * 1000,
    text: "Pico CTF",
    desc: "No information yet."
  }];
  
  const timelineElem = $(".timeline-events");
  events.sort((a, b) => a.date - b.date);
  events.forEach((event) => {
    //1px per day
    const offset = (event.date - baseline) / (1000 * 60 * 60 * 24);
    timelineElem.append(`<div class="event circle" style="left: ${offset}px"></div>`);
  });
  
  $(".event").click(function(){
    const offset = $(this).css("left");
    
    $(this).siblings().filter(".line").css("left", offset.split("px").join("") - 10000 + "px");
    
    $(this).siblings().filter(".selected").removeClass("selected");
    $(this).addClass("selected");
  });
  $(".timeline-btn").click(function(){
    const classes = $(this).attr("class");
    let delta = 0;
    if(classes.indexOf("left") !== -1){
      delta = 1;
    }else if(classes.indexOf("right") !== -1){
      delta = -1;
    }else{
      console.error("Missing delta", this);
    }
    
    $(this).find("~ .timeline-body .timeline-events").animate({
      left: `+=${delta * TIMELINE_BUTTON_DELTA}`
    }, 250);
  });
  
  $(".event").click();
});