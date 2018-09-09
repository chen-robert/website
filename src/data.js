const data = {
  "redpwn": {
    events: [
    {
      date: "9/28/17",
      title: "Founding",
      desc: "Met TPA on FTW and started doing CTFs together."
    },{
      date: "11/18/17",
      title: "Easy CTF",
      desc: "Two person team. Placed top 30."
    },{
      date: "1/28/18",
      title: "Blevy",
      desc: "The god himself!"
    },{
      date: "5/28/18",
      title: "PACTF",
      desc: "Placed 3rd."
    },{
      date: "9/30/18",
      title: "Pico CTF",
      desc: "No information yet."
    }
    ],
    name: "Redpwn"
  }
};

Object.keys(data).forEach(key => {
  const {events} = data[key];
  events.forEach(event => event.date = new Date(event.date).valueOf());
});

export default data;