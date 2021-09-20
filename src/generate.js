const fs = require("fs").promises;
const path = require("path");
const assert = require("assert");

const ejs = require("ejs");
const yaml = require("yaml");

const {
  newPathCreate,
  getNewPath,
  getFiles,
  PUBLIC_DIR,
  ROOT_DIR
} = require("./util.js");
const ops = require("./ops.js");
const genRSS = require("./rss.js");

const hljs = require('highlight.js');
const anchor = require('markdown-it-anchor');

const makeTOC = obj => {
	const ret = {
		children: []
	};
	for (const key of Object.keys(obj)) {
		const entry = {
			slug: key,
			children: []
		};

		for (const val of obj[key]) {
			entry.children.push({
				slug: val[0],
				href: config.blog.path + val[1],
				children: []
			});
		}

		ret.children.push(entry);
	}
	return ret;
}


const md = (markdown, anchorize=true) => {
	const toc = {
		children: [],
		height: 0
	};

	let curr = toc;

	let marked = require('markdown-it')({
		highlight: function (str, lang) {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return hljs.highlight(str, {
						language: lang
					}).value;
				} catch (e) {
					console.error(e)
				}
			}

			return '';
		},
		typographer: true,
		html: true,
		breaks: true
	})
	if (anchorize) {
		marked = marked.use(anchor, {
			permalink: (...args) => {
				const [slug, opts, state, idx] = args;

				const tag = state.tokens[idx].tag.toLowerCase();
				assert(tag.startsWith("h") && tag.length == 2);

				const val = Number.parseInt(tag[1]);
				while (curr.height >= val) {
					curr = curr.parent;
				}

				const next = {
					parent: curr,
					height: val,
					children: [],
					slug: decodeURIComponent(slug),
					href: "#" + slug
				}

				curr.children.push(next);
				curr = next;

				anchor.permalink.ariaHidden({
					placement: 'before',
					symbol: `<span aria-hidden="true">${'#'.repeat(Math.max(1, val - 1))}</span>`
				})(...args);
			}
		});
	}

	return [
		marked.render.bind(marked)(markdown),
		toc
	];
}

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

		const [contentHTML, contentTOC] = md(content);

    posts.push({
			content: await ops["html"](contentHTML),
			toc: contentTOC,
      summary: await ops["html"](md(summary, /*anchorize=*/false)[0]),
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
      posts: posts.slice(i, i + postsPerPage),
			toc: makeTOC(config.blog.toc)
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
			toc: post.toc
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
