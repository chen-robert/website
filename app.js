const express = require("express"),
 autoprefixer = require('express-autoprefixer'),
 lessMiddleware = require('less-middleware');

const PORT = process.env.PORT || 3000;

const app = express();
app.set("view engine", "ejs");

const staticPath = __dirname + '/public';
app.use(lessMiddleware(staticPath));
app.use(autoprefixer({browsers: ["last 3 versions", "> 1%"], cascade: false}));
app.use(express.static(staticPath));

app.get("/", (req, res) => {
  res.render("index")
});

app.listen(PORT, () => console.log(`Started server at port ${PORT}`));
