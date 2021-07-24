const fs = require("fs").promises;
const path = require("path");

const ejs = require("ejs");
const yaml = require("yaml");

const { 
  newPathCreate, 
  getNewPath, 
  getFiles, 
  OUTPUT_DIR, 
  PUBLIC_DIR,
  ROOT_DIR
} = require("./util.js");
const ops = require("./ops.js");
const genRSS = require("./rss.js");

const hljs = require('highlight.js'); 
const marked = require('markdown-it')({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, {
          language: lang
        }).value;
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

const config = require("../config.json");

const buildPublic = async () => {
  for await (const filepath of getFiles(PUBLIC_DIR)) {
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
  
  await fs.copyFile(path.join(ROOT_DIR, "/node_modules/highlight.js/styles/default.css"), await getNewPath("highlight.css"));
}

// 2019-10-17-pico19-ghost-diary.md 
// => 2019/10/17/pico19-ghost-diary.md
const pathToKey = file => {
  let ret = path.basename(file, ".md");

  for(let i = 0; i < 3; i++) ret = ret.replace("-", "/");

  return ret;
}

// 2019-10-17-pico19-ghost-diary.md 
// => Pico19 Ghost Diary
const pathToTitle = file => {
  return path.basename(file, ".md").split("-").slice(3).map(a => a.toUpperCase()[0] + a.substring(1)).join(" ")
}

// 2019-10-17-pico19-ghost-diary.md 
// => Date corresponding to 2019-10-17
const pathToDate = file => {
  const ret = new Date(0);
  ret.setHours(0);

  const parts = path.basename(file).split("-");
  ret.setYear(parts[0]);
  ret.setMonth(Number(parts[1]) - 1);
  ret.setDate(parts[2]);
  
  return ret;
}

;(async () => {
  await fs.rmdir(OUTPUT_DIR, { recursive: true });
  await buildPublic();

  const posts = [];
  for await (const file of getFiles('./posts', "md")) {
    const data = (await fs.readFile(file)).toString().trim();
    
    let content = data;
    let postConfig = Object.create(null);

    postConfig.title = pathToTitle(file);
    postConfig.description = "";
    postConfig.tags = [];

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
        postConfig[key] = yamlData[key];
      }

      content = data.split("---").slice(2).join("---");
    }

    const summary = content.split("<!--more-->")[0];

    posts.push({
      content: md(content),
      summary: md(summary),
      config: postConfig,
      path: "/blog/" + pathToKey(file),
      timestamp: pathToDate(file)
    }); 
  }
  posts.sort((a, b) => b.path.localeCompare(a.path));

  const ejsConfig = {
    gtag: config.gtag
  }

  const toWrite = [];
  
  const { postsPerPage } = config.blog;
  for (let i = 0; i < posts.length; i += postsPerPage) {
    const data = await ejs.renderFile(path.join(ROOT_DIR, "views/blog.ejs"), {
      ...ejsConfig,
      title: "Blog",
      posts: posts.slice(i, i + postsPerPage)
    });
  
    if (i == 0) {
      toWrite.push({ path: "blog.html", data });
      toWrite.push({ path: "blog/index.html", data });
    }
      
    toWrite.push({ path: `blog/${i / postsPerPage}.html`, data });
  }

  for (const post of posts) {
    const data = await ejs.renderFile(path.join(ROOT_DIR, "views/post.ejs"), { 
      ...ejsConfig,
      content: post.content,
      config: post.config,
      title: post.config.title,
    });

    toWrite.push({ path: post.path + ".html", data });
  }

  {
    const data = await ejs.renderFile(path.join(ROOT_DIR, "views/index.ejs"), {
      ...ejsConfig,
      config,
      title: "Robert Chen",
    });

    toWrite.push({ path: "index.html", data });
  }
  
  await Promise.all(toWrite.map(async ({ path, data }) => fs.writeFile(await getNewPath(path), await ops["html"](data))));

  await fs.writeFile(await getNewPath("feed.xml"), genRSS(posts));
})();
