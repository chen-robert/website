const timeline = (id, title) => `
<div id="${id}" class="row scrollable">
  <div class="col">
    <h3>${title}</h3>
    <div class="timeline">
      <span class="circle timeline-btn left material-icons">navigate_before</span>
      <span class="circle timeline-btn right material-icons">navigate_next</span>
      <div class="timeline-body">
        <div class="line"></div>
        <div class="timeline-events">
          <div class="line alt"></div>
        </div>
      </div>
    </div>
    <div class="timeline-desc"> 
      <h5 class="title">Title</h5>
      <p class="description">Description lorem ipsum</p>
    </div>
  </div>
</div>
`;

export default timeline;
