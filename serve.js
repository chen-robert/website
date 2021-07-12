const express = require("express");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(__dirname + '/build', {
  extensions: ['html']
}));

app.listen(PORT, () => console.log(`Started server at port ${PORT}`));
