const xml = require("xml");
const cheerio = require("cheerio");

const config = require("../config.json");

const blogURL = `https://${config.host}${config.blog.path}`;
const websiteURL = `https://${config.host}`;

const buildFeed = posts => {
  posts.sort((a, b) => b.path.localeCompare(a.path));

  return posts.map(post => {
    const $ = cheerio.load(post.content);

    $("a[href^='/'], img[src^='/'], source[srcset^='/']").each((i, elem) => {
      const $elem = $(elem);
      if ($elem.attr("href")) {
        $elem.attr("href", `${websiteURL}${$elem.attr("href")}`);
      }
      if ($elem.attr("src")) {
        $elem.attr("src", `${websiteURL}${$elem.attr("src")}`);
      }
      if ($elem.attr("srcset")) {
        $elem.attr("srcset", `${websiteURL}${$elem.attr("srcset")}`);
      }
    });

    const postURL = `${websiteURL}${post.path}`;
    return {
      item: [
        { title: post.config.title },
        { pubDate: post.timestamp.toUTCString() },
        { link: postURL },
        { guid: postURL },
        {
          description: {
            _cdata: $.html()
          }
        }
      ]
    }
  });
}


module.exports = posts => {
  const feed = {
    rss: [
      {
        _attr: {
          version: "2.0",
          "xmlns:atom": "http://www.w3.org/2005/Atom",
        },
      },
      {
        channel: [
          {
            "atom:link": {
              _attr: {
                href: `${websiteURL}/feed.xml`,
                rel: "self",
                type: "application/rss+xml",
              },
            },
          },
          { title: config.host },
          { link: blogURL },
          { description: "A collection of some thoughts, occasionally security related" },
          { language: "en-US" },
          { webMaster: `${config.me.email} (${config.me.name})` },
          ...buildFeed(posts)
        ],
      },
    ],
  }

  return '<?xml version="1.0" encoding="UTF-8"?>' + xml(feed);
}
