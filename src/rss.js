const xml = require("xml");

const config = require("../config.json");

const blogURL = `https://${config.host}${config.blog.path}`;
const websiteURL = `https://${config.host}`;

const buildFeed = posts => {
  posts.sort((a, b) => b.path.localeCompare(a.path));
  
  return posts.map(post => {
    const postURL = `${websiteURL}${post.path}`;
    return {
      item: [
        { title: post.config.title },
        { pubDate: post.timestamp.toUTCString() },
        { link: postURL },
        { guid: postURL },
        {
          description: {
            _cdata: post.content
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
