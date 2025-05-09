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

  Alpine.store("clock").init();

  Alpine.data("mapHandler", () => ({
    map: undefined,
    stopMarker: undefined,
    markers: [],
    mapContainer: undefined,
    selectedLine: undefined,
    selectedStop: undefined,
    shadowRoot: undefined,

    init() {
      const wrapper = document.getElementById("map-wrapper");
      this.shadowRoot = wrapper.attachShadow({ mode: "open" });

      this.mapContainer = document.createElement("div");
      this.mapContainer.id = "map";
      this.mapContainer.style.height = "300px";
      this.mapContainer.style.transition = "opacity 0.5s ease";
      this.mapContainer.style.opacity = 0;

      const leafletCSS = document.createElement("link");
      leafletCSS.rel = "stylesheet";
      leafletCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      const leafletJS = document.createElement("script");
      leafletJS.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      leafletJS.crossOrigin = "";
      this.shadowRoot.appendChild(leafletCSS);
      this.shadowRoot.appendChild(leafletJS);
      this.shadowRoot.appendChild(this.mapContainer);

      setTimeout(() => {
        L.Icon.Default.mergeOptions({
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        this.map = L.map(this.mapContainer);

        // Add a tile layer (OpenStreetMap in this case)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.map);
        //this.getPositionOfVehicles("10");
      }, 100);
    },

    selectStop(stopId) {
      this.markers.forEach((it) => {
        it.remove();
      });
      this.stopMarker?.remove();

      this.markers = [];

      const coords = this.getCoordsOfStop(stopId);
      if (coords) {
        this.selectedStop = stopId;
        this.mapContainer.style.opacity = 1;
        this.map.setView(coords, 15);
        this.stopMarker = L.marker(coords).addTo(this.map);
      } else {
        this.mapContainer.style.opacity = 0;
      }
    },

    getPositionOfVehicles(line) {
      const resourceId = "a9b3841d-e977-474e-9e86-8789e470a85a_v1";
      const filters = JSON.stringify({ Nazwa_Linii: line });

      const url = new URL("https://wroschedule-vqfxpgdr0k7f.deno.dev/api");
      url.searchParams.set("resource_id", resourceId);
      url.searchParams.set("filters", filters);

      this.markers.forEach((it) => {
        it.remove();
      });
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          //console.log("Results:", data.result.records);
          data.result.records.forEach((res) => {
            const marker = L.circleMarker(
              [
                res["Ostatnia_Pozycja_Szerokosc"],
                res["Ostatnia_Pozycja_Dlugosc"],
              ],
              {
                radius: 3,
                color: "#ff0000", // stroke color
                weight: 2, // stroke width
                fillColor: "#ff0000", // fill color
                fillOpacity: 0.6, // fill opacity (0 = transparent, 1 = opaque)
              },
            ).addTo(this.map);
            this.markers.push(marker);
            this.scrollToBottom();
          });
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    },

    getCoordsOfStop(stopId) {
      switch (stopId) {
        case "10407":
          return [51.116632, 17.000369];
        case "12217":
          return [51.128768, 16.989697];
        case "12218":
          return [51.129142, 16.988613];
        case "12601":
          return [51.133016, 16.972807];
        case "12602":
          return [51.132818, 16.972858];
        case "12313":
          return [51.128611, 16.989697];
        case "12314":
          return [51.127862, 16.990662];
        case "12701":
          return [51.133407, 16.97183];
        case "12702":
          return [51.132565, 16.972801];
        case "12711":
          return [51.132723, 16.973877];
        case "12712":
          return [51.133227, 16.974073];
        default:
          return undefined;
      }
    },
    scrollToBottom() {
      const bottom = this.shadowRoot.querySelector("#map");
      if (bottom) {
        bottom.scrollIntoView({ behavior: "smooth" });
      }
    },
  }));

  Alpine.data("stopsData", () => ({
    stopsArray: [],
    nextArrivals: {},
    playDate: new Date(),
    map: undefined,
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
        this.nextArrivals[stop.id] = [];
        stop.lines.forEach((line) => {
          const timetable = this.getTimetableForDayType(line);

          const nextArrivals = this.getNearestXArrivals(
            timetable,
            since,
            2,
          ).map((arrival) => {
            return {
              lineAndDestination: line.name + " " + line.destination,
              timestamp: this.hourAndMinuteToDate(arrival),
              line: line.name,
              hourAndMin: arrival,
            };
          });
          this.nextArrivals[stop.id] = [
            ...(this.nextArrivals[stop.id] || []),
            ...nextArrivals,
          ].sort((a, b) => a.timestamp - b.timestamp);
        });
      });
    },

    calculateMinutesDifference(date) {
      const diffMs = date - Alpine.store("clock").now;
      const diffMinutes = diffMs / (1000 * 60);
      return Math.round(diffMinutes);
    },

    getColor(minutes) {
      if (minutes <= 0) return "red";
      if (minutes === 1) return "#942D0D";
      if (minutes <= 4) return "#F56B3D";
      return "";
    },

    getTimetableForDayType(line) {
      switch (this.weekdayType) {
        case "sunday":
          return line.sundayTT;
        case "saturday":
          return line.saturdayTT;
        default:
          return line.weekdayTT;
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
          return "🚊 → Legnicka";
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

      try {
        const response = await fetch(
          "https://wroschedule-vqfxpgdr0k7f.deno.dev/stopdata",
        );
        const compressed = await response.arrayBuffer();
        const data = await unzip(compressed);
        //const data = await response.json();
        const text = new TextDecoder("utf-8").decode(data[0].buffer);
        const json = JSON.parse(text);

        this.stopsArray = Object.values(json.stops)
          .filter((stop) => {
            return [
              "12701",
              "12702",
              "12217",
              "12218",
              "12313",
              "12314",
              "10407",
              "12601",
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

const unzip = async function (zip_buffer) {
  const zip_array = new Uint8Array(zip_buffer);
  const data_view = new DataView(zip_buffer);
  const output = [];
  let index = 0;
  while (true) {
    const signature = data_view.getUint32(index, true);
    if (signature === 0x04034b50) {
      // local file info
      const file = {};
      const filename_length = data_view.getUint16(index + 26, true);
      const extra_length = data_view.getUint16(index + 28, true);
      const filename_bytes = new Uint8Array(
        zip_array.slice(index + 30, index + 30 + filename_length),
      );
      file.filename = new TextDecoder("utf8").decode(filename_bytes);
      file.starts_at = index + 30 + filename_length + extra_length;
      file.compressed_size = data_view.getUint32(index + 18, true);
      file.compression_method = data_view.getUint16(index + 8, true);
      file.general_purpose_flag = data_view.getUint16(index + 6, true);
      file.stream_bit_is_set = (file.general_purpose_flag >> 3) & (0x1 === 1); // bit 3 has the "streamed" flag
      if (file.stream_bit_is_set) {
        let searching_for_stream_header = true;
        let search_index = file.starts_at;
        while (searching_for_stream_header) {
          const signature = data_view.getUint32(search_index, true);
          if (signature === 0x08074b50) {
            // streaming data info
            file.compressed_size = data_view.getUint32(search_index + 8, true);
            searching_for_stream_header = false;
          } else {
            search_index = search_index + 1;
          }
        }
      }
      const compressed_data_end = file.starts_at + file.compressed_size;
      const jump_to_index = file.stream_bit_is_set
        ? compressed_data_end + 16
        : compressed_data_end;
      const raw_buffer = zip_array.slice(file.starts_at, compressed_data_end);
      if (file.compression_method === 0x00) {
        // "none", uncompressed/inflated
        file.buffer = raw_buffer;
      } else if (file.compression_method === 0x08) {
        // "DEFLATE", compressed/deflated
        file.buffer = await new Response(
          new Blob([raw_buffer])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw")),
        ).arrayBuffer();
      } else {
        throw new Error(
          `Unsupported compression method 0x${file.compression_method.toString(16)}`,
        );
      }
      index = jump_to_index;
      const is_directory = /\/$/.test(file.filename);
      if (!is_directory) {
        output.push(file);
      }
    } else if (signature === 0x02014b50) {
      // central directory info (this just gets jumped over)
      const filename_length = data_view.getUint16(index + 28, true);
      const extra_length = data_view.getUint16(index + 30, true);
      const comment_length = data_view.getUint16(index + 32, true);
      index = index + 46 + filename_length + extra_length + comment_length;
    } else if (signature === 0x06054b50) {
      // end of central directory
      break;
    } else {
      throw new Error(
        `Unsupported zip format signature 0x${signature.toString(16)}`,
      );
    }
  }
  return output;
};
