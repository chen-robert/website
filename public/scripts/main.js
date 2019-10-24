$(() => {
  $(".panel").click(function () {
    $(".panel").removeClass("clicked");
    $(this).addClass("clicked");    
  });
});

const img = new Image();
img.addEventListener("load", () => {
  let tick = 0;

  const canvas = document.createElement("canvas");
  canvas.width = 250;
  canvas.height = 250;

  const ctx = canvas.getContext("2d");
  const res = render.getContext("2d");
  ctx.drawImage(img, 0, 0, 250, 250);

  const step = () => {
    res.clearRect(0, 0, render.width, render.height);
    const BLOCK = 25;
    const horiz = tick >= 200;
    for(let i = 0; i < 500; i += BLOCK){
      const data = horiz? ctx.getImageData(0, i, 500, BLOCK) : ctx.getImageData(i, 0, BLOCK, 500);
      
      let y = 0;
      if(tick < 175) y = 125 + 10 * (5 * i + 500) * Math.pow(0.95, tick);
      else if(tick < 200) y = 125;
      else y = 125 + Math.pow(1.05, tick - 200 - i / 5) + Math.max(tick - 200 - i / 5, 0) / 10;
      
      if(horiz) res.putImageData(data, y - 125, i + 125);
      else res.putImageData(data, i, y);
    }

    tick++;
    if(tick > 400) tick = 0;
  }

  setTimeout(() => setInterval(step, 20), 1000);
});
//img.src = "/imgs/pfp.jpg";
