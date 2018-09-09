import $ from "jquery";
const TIMELINE_BUTTON_DELTA = 350;

const utils = {
  create: function($rootElem, events) {
    const baseline = events.map((event) => event.date).reduce((a, b) => Math.min(a, b));
    const $timelineElem = $rootElem.find(".timeline-events");
    events.sort((a, b) => a.date - b.date);
    events.forEach((event) => {
      //1px per day
      const offset = (event.date - baseline) / (1000 * 60 * 60 * 24);
      const elem = $.parseHTML(`<div class="event circle" style="left: ${offset}px"></div>`);
      $(elem).data("event", event);
      $timelineElem.append(elem);
    });
    
    this.init($rootElem);
  },
  init: ($rootElem) => {
    const $descElem = $rootElem.find(".timeline-desc");
    $rootElem.find(".event").click(function(){
      const offset = $(this).css("left");
      
      $(this).siblings().filter(".line").css("left", offset.split("px").join("") - 10000 + "px");
      
      $(this).siblings().filter(".selected").removeClass("selected");
      $(this).addClass("selected");
      
      const {title, desc} = $(this).data().event;
      $descElem.find(".title").fadeOut(function(){
        $(this).text(title).fadeIn();
      });
      $descElem.find(".description").fadeOut(function(){
        $(this).text(desc).fadeIn();
      });
    });
    $rootElem.find(".timeline-btn").click(function(){
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
    
    $rootElem.find(".timeline-events").each((i, elem) => $(elem).find(".event").first().click()); 
  }
}

export default utils;