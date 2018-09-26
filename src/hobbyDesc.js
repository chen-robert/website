const hobby = ({name, items, altText=""}) => `
<div class="center-text panel ${altText? "panel-expandable": ""}">
  <div class="panel-title">
    <h3>${name}</h3>
  </div>
  <div class="divider"></div>
  <div class="panel-text">
    <ul class="slideable">
    ${
      // prettier-ignore
      items.map(
        desc => `
        <li>
          <p>${desc}</p>
        </li>
        `
      )
      .join("\n")
    }
    </ul>
    <p class="slideable">${altText}</p>
  </div>
</div>
`;

export default hobby;
