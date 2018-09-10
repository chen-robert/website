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
        desc: "Placed 3rd."
      },
      {
        date: "9/30/18",
        title: "Pico CTF",
        desc: "No information yet."
      }
    ],
    name: "Redpwn"
  },
  volunteering: {
    events: [
      {
        date: "8/1/17",
        title: "Kang Li",
        desc: "Went to Kang Li to teach English."
      },
      {
        date: "4/1/18",
        title: "Curriculum",
        desc: "Designed and created English curriculum. Organized different teaching groups."
      },
      {
        date: "8/1/18",
        title: "Kang Li",
        desc: "Went to Kang Li again. Nonprofit group doubled in size."
      }
    ],
    name: "Volunteer Work"
  },
  math: {
    events: [
      {
        date: "3/31/16",
        title: "Mathcounts State",
        desc: "Individual placed 9th. First placing team."
      },
      {
        date: "3/31/18",
        title: "JMO",
        desc: "Qualified for Junior Mathematical Olympiad."
      }
    ],
    name: "Competitive Math"
  }
};

Object.keys(data).forEach(key => {
  const { events } = data[key];
  events.forEach(event => (event.date = new Date(event.date).valueOf()));
});

delete data["math"];

export default data;
