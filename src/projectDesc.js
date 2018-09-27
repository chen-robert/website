const projectDesc = ({ title, desc, github="", instance="" }) => `
<div class="center-text panel">
  <div class="icon-container">
    <a ${github? `href="${github}"`: ""} title="${github? "Open in Github": "Private repository"}" target="_blank" class="material-icons small-icon ${github? "": "disabled"}">code</a>
    <a ${instance? `href="${instance}"`: ""} title="${instance? "Open webpage": "Private instance"}" target="_blank" class="material-icons small-icon ${instance? "": "disabled"}">open_in_new</a>
  </div>
  <div class="panel-title">
    <h3>${title}</h3>
  </div>
  <div class="divider"></div>
  <div class="panel-text">
    ${desc}
  </div>
</div>
`;

export default projectDesc;
