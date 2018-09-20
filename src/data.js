const data = {
  redpwn: {
    events: [
      {
        date: "9/28/17",
        title: "Founding",
        desc: "Met TPA on FTW and started doing CTFs together."
      },
      {
        date: "11/18/17",
        title: "Easy CTF",
        desc: "Two person team. Placed top 30."
      },
      {
        date: "1/28/18",
        title: "Blevy",
        desc: "The god himself!"
      },
      {
        date: "5/28/18",
        title: "PACTF",
        desc: "Placed 3rd. Won over $1200 worth of prizes. "
      },
      {
        date: "9/30/18",
        title: "Pico CTF",
        desc: "No information yet."
      }
    ],
    name: "Cybersecurity"
  },
  usaco: {
    events: [
      {
        date: "12/28/16",
        title: "Gold",
        desc: "Qualified for USACO Gold."
      },
      {
        date: "11/18/17",
        title: "Platinum",
        desc: "Qualified for USACO Platinum. Top 300 in the nation."
      },
      {
        date: "1/28/18",
        title: "Leetcode",
        desc: "Ranked 31 out of 2900 participants."
      },
      {
        date: "4/28/18",
        title: "Codeforces",
        desc: "Reached Master."
      },
    ],
    name: "Competitive Programming"
  },
};

delete data.redpwn;
delete data.usaco;

Object.keys(data).forEach(key => {
  const { events } = data[key];
  events.forEach(event => (event.date = new Date(event.date).valueOf()));
});

export default data;
