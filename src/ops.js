const less = require("less");
const webp = require("webp-converter");
const minify = require('minify');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
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
  return minify.html(data);
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
