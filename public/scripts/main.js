$(() => {
  $(".panel").click(function () {
    $(".panel").removeClass("clicked");
    $(this).addClass("clicked");    
  });
});