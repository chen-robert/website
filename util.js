const fs = require("fs").promises;
const path = require("path");

const config = require("./config.json");

const OUTPUT_DIR = path.join(__dirname, config.blog.outputDir);
const PUBLIC_DIR = path.join(__dirname, config.blog.publicDir);

const newPathCreate = async oldPath => {
  if(!oldPath.startsWith(PUBLIC_DIR)) throw "Invalid newPath";
  
  const newPath = oldPath.replace(PUBLIC_DIR, OUTPUT_DIR);
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  
  return newPath;
}

const getNewPath = async relPath => {
  const newPath = path.join(OUTPUT_DIR, relPath);

  await fs.mkdir(path.dirname(newPath), { recursive: true });
  return newPath;
}

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


module.exports = { 
  newPathCreate,
  getNewPath,
  getFiles
}
