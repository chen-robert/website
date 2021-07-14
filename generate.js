const fs = require("fs").promises;
const path = require("path");

const ejs = require("ejs");
const yaml = require("yaml");

const { newPathCreate, getNewPath, getFiles } = require("./util.js");
const ops = require("./ops.js");

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

const config = require("./config.json");

const buildPublic = async () => {
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
  
  await fs.copyFile(path.join(__dirname, "/node_modules/highlight.js/styles/default.css"), await getNewPath("highlight.css"));
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

;(async () => {
  await buildPublic();

  const posts = [];
  for await (const file of getFiles('./posts', "md")) {
    const data = (await fs.readFile(file)).toString().trim();
    
    let content = data;
    let postConfig = new Map();

    postConfig.set("title", pathToTitle(file));
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

    posts.push({
      content,
      summary,
      config: postConfig,
      path: "/blog/" + pathToKey(file)
    }); 
  }

  posts.sort((a, b) => b.path.localeCompare(a.path));

  const ejsConfig = {
    md,
    gtag: config.gtag
  }
  
  {
    const { postsPerPage } = config.blog;
    
    for (let i = 0; i < posts.length; i += postsPerPage) {
      const data = await ejs.renderFile(path.join(__dirname, "views/blog.ejs"), {
        ...ejsConfig,
        title: "Blog",
        posts: posts.slice(i, i + postsPerPage)
      });
    
      if (i == 0) await fs.writeFile(await getNewPath("blog.html"), await ops["html"](data));
      
      await fs.writeFile(await getNewPath(`blog/${i / postsPerPage}.html`), await ops["html"](data));
    }
  }

  {
    for (const post of posts) {
      const data = await ejs.renderFile(path.join(__dirname, "views/post.ejs"), { 
        ...ejsConfig,
        content: post.content,
        title: post.config.get("title"),
        description: post.config.get("description")
      });
    
      await fs.writeFile(await getNewPath(post.path + ".html"), await ops["html"](data));
    }
  }



  {
    const data = await ejs.renderFile(path.join(__dirname, "views/index.ejs"), {
      ...ejsConfig,
      config,
      title: "Robert Chen",
    });

    await fs.writeFile(await getNewPath("index.html"), await ops["html"](data));
  }


})();
