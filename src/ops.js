const less = require("less");
const webp = require("webp-converter");
const minify = require('minify');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cheerio = require("cheerio");

const fs = require("fs").promises;
const path = require("path");

const { newPathCreate } = require("./util.js");

const ops = {};

ops["png"] = async (data, filepath) => {
  const newPath = await newPathCreate(filepath);
  const newWebpPath = newPath.split(".").slice(0, -1).join(".") + ".webp";

  await fs.copyFile(filepath, newPath);
  await webp.cwebp(filepath, newWebpPath, "-q 100 -lossless");
}

ops["jpg"] = ops["png"];

ops["html"] = async (data) => {
  const $ = cheerio.load(data);

  $("img[src^='/']").each((idx, elem) => {
    const $elem = $(elem);
    
    const $pic = $("<picture/>");


    let $source = $("<source/>");
    $source.attr("srcset", $elem.attr("src").split(".").slice(0, -1) + ".webp");
    $source.attr("type", "image/webp");
    $pic.append($source);
    
    $source = $("<source/>");
    $source.attr("srcset", $elem.attr("src"));
    $pic.append($source);

    $source = $("<img/>");
    $source.attr("src", $elem.attr("src"));
    $pic.append($source);

    $elem.replaceWith($pic);
  });

  return minify.html($.html());
}

ops["js"] = async (data) => {
  return minify.js(data);
}

ops["css"] = async (data) => {
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

module.exports = ops;
