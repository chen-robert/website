const hobby = (name, items) => `
<div class="center-text panel panel-expandable">
  <div class="panel-title">
    <h3>${name}</h3>
  </div>
  <div class="divider"></div>
  <div class="panel-text">
    <ul>
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
  </div>
</div>
`;

export default hobby;
