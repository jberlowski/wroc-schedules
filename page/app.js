document.addEventListener("alpine:init", () => {
  Alpine.data("stopsData", () => ({
    stops: [],
    stopsArray: [], // Array for displaying in UI

    async loadStops() {
      try {
        // Replace with the actual proxy URL if needed
        //const response = await fetch(
        //  "https://github.com/jberlowski/wroc-schedules/releases/download/v0.0.1/out.json",
        //);
        const response = await fetch(
          "https://corsproxy.io/?url=https://github.com/jberlowski/wroc-schedules/releases/download/v0.0.1/out.json",
        );
        const data = await response.json();

        this.stops = data;
        // Convert the stops map to an array
        this.stopsArray = Object.values(data.stops).filter((stop) => {
          return ["12701", "12702", "12217", "12218", "10407"].includes(
            stop.id,
          );
        });
      } catch (error) {
        console.error("Error loading stops:", error);
      }
    },
  }));
});
