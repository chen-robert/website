import "styles/main.less";
import $ from "jquery";

$(() => {
  function isElementInViewport($elem) {
    return (
      $(document).scrollTop() + ($(window).height() * 3) / 4 >
      $elem.offset().top
    );
  }

  function checkAnimation() {
    $(".animate-listener").each((i, elem) => {
      const $elem = $(elem);
      if ($elem.hasClass("animate")) return;

      if (isElementInViewport($elem)) {
        $elem.addClass("animate");
      }
    });
  }

  // Capture scroll events
  $(window).scroll(checkAnimation);
  checkAnimation();
});
