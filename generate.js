const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const ejs = require("ejs");
const less = require("less");
const minify = require('minify');
const webp = require("webp-converter");
const yaml = require("yaml");

const autoprefixer = require('autoprefixer')
const postcss = require('postcss')

const OUTPUT_DIR = path.join(__dirname, "build");
const PUBLIC_DIR = path.join(__dirname, "public");

const hljs = require('highlight.js'); 
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
app.use(express.static(staticPath, { maxAge: 60 * 60 * 1000 }));

const config = require("./config.json");
const gtag = config.gtag;

app.get("/", (req, res) => {
});

const posts = new Map();

async function* getFiles(dir, extension) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if(dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      if(extension && !dirent.name.endsWith("." + extension)) continue;

      yield res;
    }
  }
}

const getNewPath = async relPath => {
  const newPath = path.join(OUTPUT_DIR, relPath);

  await fs.mkdir(path.dirname(newPath), { recursive: true });
  return newPath;
}

const newPathCreate = async oldPath => {
  if(!oldPath.startsWith(PUBLIC_DIR)) throw "Invalid newPath";
  
  const newPath = oldPath.replace(PUBLIC_DIR, OUTPUT_DIR);
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  
  return newPath;
}



const ops = {};

ops["png"] = async (data, filepath) => {
  const newPath = await newPathCreate(filepath);
  const newWebpPath = newPath.split(".").slice(0, -1).join(".") + ".webp";

  await fs.copyFile(filepath, newPath);
  await webp.cwebp(filepath, newWebpPath, "-q 100 -lossless");
}

ops["jpg"] = ops["png"];

ops["html"] = async (data) => {
  return minify.html(data);
}

ops["js"] = async (data) => {
  return minify.js(data);
}

ops["css"] = async (data, filepath) => {
  const result = await postcss([ autoprefixer() ]).process(data);

  if(result.css) {
    return minify.css(result.css);
  }
}

ops["less"] = async (data, filepath) => {
  try {
    const { css } = await less.render(data, { paths: [path.dirname(filepath)] });
    
    return ops["css"](css, filepath);
  } catch(e) {
    console.log("skipping on less error: %s", filepath);
  }
}


;(async () => {
  for await (const filepath of getFiles(path.join(__dirname, "public"))) {
    const data = await fs.readFile(filepath, 'utf-8');
    const ext = path.extname(filepath).substring(".".length);
    if(Object.keys(ops).includes(ext)) {
      const output = await ops[ext](data, filepath);

      if (output) {
        let newPath = await newPathCreate(filepath);

        if(ext === "less") newPath = newPath.replace(/\.less$/, ".css");

        await fs.writeFile(newPath, output);
      }
    } else {
      const newPath = await newPathCreate(filepath);
      
      await fs.copyFile(filepath, newPath);
    }
  }
})();

const pathToKey = file => {
  let ret = path.basename(file, ".md");

  for(let i = 0; i < 3; i++) ret = ret.replace("-", "/");

  return ret;
}

;(async () => {
  for await (const file of getFiles('./posts', "md")) {
    const data = (await fs.readFile(file)).toString().trim();
    
    let content = data;
    let postConfig = new Map();

    // 2019-10-17-pico19-ghost-diary.md 
    postConfig.set("title", path.basename(file, ".md").split("-").slice(3).map(a => a.toUpperCase()[0] + a.substring(1)).join(" "));
    postConfig.set("description", "");
    postConfig.set("tags", []);

    if(data.startsWith("---")) {
      /*
      ---
      <yaml>
      ---
      <post>
      */
      const configData = data.split("---")[1].trim();

      const yamlData = yaml.parse(configData);

      for (const key in yamlData) {
        postConfig.set(key, yamlData[key]);
      }

      content = data.split("---").slice(2).join("---");
    }

    const summary = content.split("<!--more-->")[0];

    posts.set(pathToKey(file), {
      content,
      summary,
      config: postConfig,
      path: "/blog/" + pathToKey(file)
    }); 
  }

  {
    const _posts = [];
    for(const [key, post] of posts.entries()) {
      _posts.push({key, post});
    }
    _posts.sort((a, b) => b.key.localeCompare(a.key));

    const { postsPerPage } = config.blog;
    
    for (let i = 0; i < _posts.length; i += postsPerPage) {
      const data = await ejs.renderFile(path.join(__dirname, "views/blog.ejs"), {
        title: "Blog",
        posts: _posts.slice(i, i + postsPerPage).map(a => a.post),
        md,
        gtag
      });
    
      if (i == 0) await fs.writeFile(await getNewPath("blog.html"), await ops["html"](data));
      
      await fs.writeFile(await getNewPath(`blog/${i / postsPerPage}.html`), await ops["html"](data));
    }
  }

  {
    for (const [key, post] of posts) {
      const data = await ejs.renderFile(path.join(__dirname, "views/post.ejs"), { 
        content: post.content,
        title: post.config.get("title"),
        description: post.config.get("description"),
        md,
        gtag
      });
    
      await fs.writeFile(await getNewPath("blog/" + key + ".html"), await ops["html"](data));
    }
  }



  {
    const data = await ejs.renderFile(path.join(__dirname, "views/index.ejs"), {
      config,
      title: "Robert Chen",
      gtag
    });

    await fs.writeFile(await getNewPath("index.html"), await ops["html"](data));
  }


  await fs.copyFile(path.join(__dirname, "/node_modules/highlight.js/styles/default.css"), await getNewPath("highlight.css"));
})();

app.get("/blog/*", (req, res) => {
  res.set('Cache-control', 'public, max-age=300');

  let key = req.path.substring("/blog/".length);
  if(key.endsWith("/")) key = key.slice(0, -1);

  if(posts.has(key)) {
    const post = posts.get(key);
  } else {
    res.status(404);
    res.end("Not Found");
  }
});

