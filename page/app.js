document.addEventListener("alpine:init", () => {
  // Global shared clock store
  Alpine.store("clock", {
    now: new Date(),

    get time() {
      return this.now.toLocaleTimeString("en-GB", { hour12: false });
    },
    get hour() {
      return this.now.getHours().toString().padStart(2, "0");
    },
    get minute() {
      return this.now.getMinutes().toString().padStart(2, "0");
    },
    get weekdayNumber() {
      return this.now.getDay();
    },
    get dayType() {
      if (this.weekdayNumber === 0) return "sunday";
      if (this.weekdayNumber === 6) return "saturday";
      return "workday";
    },

    init() {
      const updateNow = () => {
        this.now = new Date();
      };
      setInterval(updateNow, 1000);
    },
  });

  // Start the clock when Alpine loads
  Alpine.store("clock").init();

  // Stops data component
  Alpine.data("stopsData", () => ({
    stops: [],
    stopsArray: [],
    nextArrivals: {},

    init() {
      this.loadStops();
      const msUntilNextMinute =
        60000 - (new Date().getSeconds() * 1000 + new Date().getMilliseconds());

      setTimeout(() => {
        setInterval(() => {
          this.buildNextArrivals();
        }, 60000);
      }, msUntilNextMinute);
    },

    buildNextArrivals() {
      console.log("reload", Date.now());
      const since = Date.now() - 1000 * 60 * 3;
      this.stopsArray.forEach((stop) => {
        this.nextArrivals[stop.id] = [];
        console.log(this.weekdayType);
        stop.lines.forEach((line) => {
          //console.log();

          //console.log(this.getTimetableForDayType(line));
          const timetable = this.getTimetableForDayType(line);

          console.log(line.name, this.getNearestXArrivals(timetable, since, 2));
          const nextArrivals = this.getNearestXArrivals(
            timetable,
            since,
            2,
          ).map((arrival) => {
            return {
              line: line.name + " " + line.destination,
              timestamp: this.hourAndMinuteToDate(arrival),
              hourAndMin: arrival,
            };
          });
          this.nextArrivals[stop.id] = [
            ...(this.nextArrivals[stop.id] || []),
            ...nextArrivals,
          ].sort((a, b) => a.timestamp - b.timestamp);
        });
      });
      console.log(this.nextArrivals);
    },

    getTimetableForDayType(line) {
      switch (this.weekdayType) {
        case "sunday":
          return line.sundayTT;
        case "saturday":
          return line.saturdayTT;
        default:
          return line.workday;
      }
    },

    hourAndMinuteToDate(hourToMinStr) {
      const [hours, minutes] = hourToMinStr.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date;
    },

    getNearestXArrivals(timetable, since, n) {
      const date = new Date();
      return timetable.reduce((acc, hourAndMinute) => {
        if (acc.length >= n) return acc; // Stop if we've collected 'n' elements
        const [hours, minutes] = hourAndMinute.split(":").map(Number);
        date.setHours(hours, minutes);
        if (date > since) {
          acc.push(hourAndMinute);
        }
        return acc;
      }, []);
    },

    get weekdayType() {
      return Alpine.store("clock").dayType;
    },

    async loadStops() {
      const day = this.weekdayType;
      console.log("Loading stops for:", day);

      try {
        //const response = await fetch(
        //  "https://github.com/jberlowski/wroc-schedules/releases/download/v0.0.1/out.json",
        //);
        const response = await fetch(
          "https://corsproxy.io/?url=https://github.com/jberlowski/wroc-schedules/releases/download/v0.0.1/out.json",
        );
        const data = await response.json();

        this.stops = data;
        this.stopsArray = Object.values(data.stops).filter((stop) => {
          return ["12701", "12702", "12217", "12218", "10407"].includes(
            stop.id,
          );
        });
        this.buildNextArrivals();
      } catch (error) {
        console.error("Error loading stops:", error);
      }
    },
  }));
});
