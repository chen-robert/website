const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const autoprefixer = require('express-autoprefixer');
const lessMiddleware = require('less-middleware');

const hljs = require('highlight.js'); 
// Actual default values
const marked = require('markdown-it')({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (e) {
        console.log(e)
      }
    }

    return ''; 
  },
  typographer: true,
  html: true,
  breaks: true
});
const md = marked.render.bind(marked);

const PORT = process.env.PORT || 3000;

const app = express();
app.set("view engine", "ejs");

const staticPath = __dirname + '/public';
app.use(lessMiddleware(staticPath));
app.use(autoprefixer({browsers: ["last 3 versions", "> 1%"], cascade: false}));
app.use(express.static(staticPath, { maxAge: 60 * 60 * 1000 }));

const config = require("./config.json");

app.get("/", (req, res) => {
  res.render("index", {
    config,
    title: "Robert Chen"
  })
});

const posts = new Map();

async function* getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if(dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      if(dirent.name.endsWith(".md")) yield res;
    }
  }
}

const pathToKey = file => {
  let ret = path.basename(file, ".md");

  for(let i = 0; i < 3; i++) ret = ret.replace("-", "/");

  return ret;
}

;(async () => {
  for await (const file of getFiles('./posts')) {
    const data = (await fs.readFile(file)).toString().trim();
    
    let content = data;
    let config = new Map();

    // 2019-10-17-pico19-ghost-diary.md 
    config.set("title", path.basename(file, ".md").split("-").slice(3).map(a => a.toUpperCase()[0] + a.substring(1)).join(" "));
    config.set("description", "");

    if(data.startsWith("---")) {
      /*
      ---
      key: value
      ---
      post
      */
      const configData = data.split("---")[1].trim();

      configData.split("\n").forEach(line => {
        const [key, value] = line.split(": ");
        config.set(key, value);
      });

      content = data.split("---").slice(2).join("---");
    }

    const summary = content.split("<!--more-->")[0];

    posts.set(pathToKey(file), {
      content,
      summary,
      config,
      path: "/blog/" + pathToKey(file)
    }); 
  }
})();

app.get("/blog", (req, res) => {
  res.set('Cache-control', 'public, max-age=300');

  const _posts = [];
  for(const [key, post] of posts.entries()) {
    _posts.push({key, post});
  }
  _posts.sort((a, b) => b.key.localeCompare(a.key));

  res.render("blog", {
    title: "Blog",
    posts: _posts.map(a => a.post),
    md
  })
});

app.get("/blog/*", (req, res) => {
  res.set('Cache-control', 'public, max-age=300');

  let key = req.path.substring("/blog/".length);
  if(key.endsWith("/")) key = key.slice(0, -1);

  if(posts.has(key)) {
    const post = posts.get(key);
    res.render("post", { 
      content: post.content,
      title: post.config.get("title"),
      description: post.config.get("description"),
      md
    });
  } else {
    res.status(404);
    res.end("Not Found");
  }
});

app.get("/highlight.css", (req, res) => res.sendFile(__dirname + "/node_modules/highlight.js/styles/default.css"));

app.listen(PORT, () => console.log(`Started server at port ${PORT}`));
