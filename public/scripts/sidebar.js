document.body.onload = () => {
  const icoElem = document.querySelectorAll(".mobile-sidebar-ico")[0];
  const sidebarElem = document.getElementsByClassName("sidebar")[0];

  icoElem.onclick = () => {
    sidebarElem.classList.toggle("expanded");
    icoElem.classList.toggle("expanded");
  }

  document.querySelectorAll(".content")[0].onclick = () => {
    sidebarElem.classList.remove("expanded");
    icoElem.classList.remove("expanded");
  }
};
