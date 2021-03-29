const wait = time => new Promise(res => setTimeout(res, time));

const config = JSON.parse(document.getElementById("config").dataset.value);

const DELAY = 100;
const clearBuffer = async () => {
  const elems = document.querySelectorAll(".title--container");
  for(const elem of elems) {
    elem.classList.add("deleted");
    await wait(DELAY); 
  }

  for(const elem of elems) elem.remove();
}

const bufferElem = document.querySelectorAll("[data-target='buffer']")[0];
const textTemplate = text => `
<div class="title--container">
	<h1 class="title--text title--text__secondary">${text}</h1>
</div>`;
const titleTemplate = text => `
<div class="title--container">
	<h1 class="title--text">${text}</h1>
</div>`;
const subtitleTemplate = text => `
<div class="title--container">
	<h1 class="title--text title--subtext">${text}</h1>
</div>`;
const linkTemplate = links => {
	let ret = `<div class="title--container title--link-container">`;
  for(const link of links) {
	  ret += `<a class="title--link" href="${link.url}">${link.text}</a>`
  }
  ret += `</div>`;
  return ret;
};
const appendBuffer = async ({ text, title, subtitle, links }) => {
  let data = text;
  let template = textTemplate;
  if(title) template = titleTemplate;
  if(subtitle) template = subtitleTemplate;

  if(links) {
    template = linkTemplate;
    data = links;
  }

  bufferElem.insertAdjacentHTML('beforeend', template(data));
  await wait(DELAY); 
}

let processing = false;
const checkProcessing = () => {
  if(processing) return true;

  processing = true;
  return false;
}

const wrapper = fn => async () => {
  if(checkProcessing()) return;

  await clearBuffer();
  await fn();

  processing = false;
}

const setAboutBuffer = wrapper(async () => {
	await appendBuffer({ text: "About", title: true });
  const lines = [...config.about.split("\n")];
  for(const line of lines) {
    await appendBuffer({ text: line });
  }

  await appendBuffer({ text: "" });
  await appendBuffer({ text: "Stuff I've Broke", subtitle: true });
  await appendBuffer({ text: `Chrome &#183; SBX` });
  await appendBuffer({ text: `GitHub &#183; no-interaction XSS` });
  await appendBuffer({ text: `ASUS Router &#183; pre-auth RCE` });
  await appendBuffer({ text: "" });

  await appendBuffer({ text: "Stuff I've Made", subtitle: true });
  await appendBuffer({ text: `rCTF &#183; <a href="http://rctf.redpwn.net/" class="title--link">Website</a> &#183; <a href="https://github.com/redpwn/rctf" class="title--link">GitHub</a>` });
  await appendBuffer({ text: `contest-judge &#183; <a href="https://github.com/chen-robert/contest-judge" class="title--link">GitHub</a>` });
});

const setIndexBuffer = wrapper(async () => {
	await appendBuffer({ text: "Robert Chen", title: true });
  const lines = ["security research and software development", "tldr; I code"];
  for(const line of lines) {
    await appendBuffer({ text: line });
  }
  await appendBuffer({
    links: [
      { url: "mailto:me@robertchen.cc", text: "me@robertchen.cc" },
      { url: "https://hackerone.com/notdeghost", text: "@notdeghost" }
    ]
  });
});

const setBlog = wrapper(async () => {
	await appendBuffer({ text: "Blog", title: true });
  
});

let isIndex = true;
const setAbout = () => {
  const localIsIndex = isIndex;

  abtElem.classList.remove("not-deleted");
  abtElem.classList.add("deleted");
  setTimeout(() => {
    abtElem.innerText = localIsIndex? "Index": "About";
    abtElem.href = localIsIndex? "#": "#about";
    abtElem.classList.remove("deleted");
    abtElem.style.opacity = "0";
    setTimeout(() => {
      abtElem.style.opacity = 1;
      abtElem.classList.add("not-deleted");
      setTimeout(() => abtElem.classList.remove("not-deleted"), 1000);
    }, 100);
  }, 1000 - 100);

  if(isIndex) setAboutBuffer();
  else setIndexBuffer();

  isIndex = !isIndex;
}

const abtElem = document.querySelectorAll("a[data-action='about']")[0];
abtElem.onclick = setAbout;

document.body.onload = () => {
  setTimeout(() => {
    if(location.hash === "#about") setAbout();
  }, 2500);
}
