document.addEventListener("alpine:init", () => {
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
    playDate: new Date(),
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
      const since = Date.now() - 1000 * 60 * 3;
      this.stopsArray.forEach((stop) => {
        console.log("start", stop.name);
        this.nextArrivals[stop.id] = [];
        stop.lines.forEach((line) => {
          //console.log();

          //console.log(this.getTimetableForDayType(line));
          const timetable = this.getTimetableForDayType(line);

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
        console.log("done", stop.name);
      });
    },

    calculateMinutesDifference(date) {
      const diffMs = date - Alpine.store("clock").now;
      const diffMinutes = diffMs / (1000 * 60);
      return Math.round(diffMinutes);
    },

    getColor(minutes) {
      if (minutes <= 0) return "red";
      if (minutes === 1) return "orange";
      if (minutes <= 4) return "yellow";
      return "";
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
      const date = this.playDate;
      return timetable.reduce((acc, hourAndMinute) => {
        if (acc.length >= n) return acc;
        const [hours, minutes] = hourAndMinute.split(":").map(Number);
        date.setHours(hours, minutes);
        if (date > since) {
          acc.push(hourAndMinute);
        }
        return acc;
      }, []);
    },

    getLabelForStop(id) {
      switch (id) {
        case "10407":
          return "🚊 -> Legnicka";

        case "12217":
          return "🚊 → Kozanów";
        case "12218":
          return "🚊 → Centrum";
        case "12601":
          return "🚊 → Górnicza/T. Arena";
        case "12602":
          return "🚊 → Port Popo/Legnicka";
        case "12313":
          return "🚌 (od strony Port Popo)";
        case "12314":
          return "🚌 (przy Biedronce)";
        case "12701":
          return "🚌 (przy Tramwajach) -> Leśnica";
        case "12702":
          return "🚌 (przy Parku) -> PL. JP II";
        case "12711":
          return "🚌 (przy Kościele) -> Kozia/Kozanów";
        case "12712":
          return "🚌 (przy Kościele) -> PL. JP II";
        default:
          return "";
      }
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
        this.stopsArray = Object.values(data.stops)
          .filter((stop) => {
            return [
              //"12701",
              "12702",
              "12217",
              "12218",
              "12313",
              "12314",
              "10407",
              //"12601",
              "12602",
              "12711",
              "12712",
            ].includes(stop.id);
          })
          .map((stop) => {
            stop.label = this.getLabelForStop(stop.id);
            return stop;
          });
        this.buildNextArrivals();
      } catch (error) {
        console.error("Error loading stops:", error);
      }
    },
  }));
});
