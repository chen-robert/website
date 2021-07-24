const finalhandler = require("finalhandler");
const serveStatic = require("serve-static");

const http = require("http");
const path = require("path");

const PORT = process.env.PORT || 3000;

const serve = serveStatic(path.join(__dirname, "..", "build"), {
  extensions: [ "html" ]
})

// Create server
const server = http.createServer((req, res) => {
  serve(req, res, finalhandler(req, res))
});

server.listen(3000, () => console.log(`Started server at port ${PORT}`));
