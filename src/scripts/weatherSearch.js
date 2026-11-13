import L from "leaflet";
import "leaflet/dist/leaflet.css";

let activeMap = null;

export default function initWeatherSearch() {
  const input = document.querySelector("#search-input");
  const weatherResults = document.querySelector(".weather-results");

  if (!input || !weatherResults) {
    return;
  }

  let activeController = null;
  let latestRequestId = 0;

  async function loadWeather(city) {
    activeController?.abort();
    activeController = null;
    const requestId = ++latestRequestId;
    if (!city) {
      renderError("Please enter a city name.", weatherResults);
      return;
    }

    const controller = new AbortController();
    activeController = controller;

    // todo add a loading animation
    disposeActiveMap();
    weatherResults.textContent = "Loading weather...";

    try {
      const weather = await fetchWeatherData(city, controller.signal);
      if (requestId !== latestRequestId) {
        return;
      }

      renderWeatherData(weather, weatherResults);
    } catch (error) {
      if (error.name === "AbortError" || requestId !== latestRequestId) {
        return;
      }

      renderError(error.message, weatherResults);
    } finally {
      if (requestId === latestRequestId) {
        activeController = null;
      }
    }
  }

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    loadWeather(input.value.trim());
  });

  loadWeather("Kyoto");
}

async function fetchWeatherData(city, signal) {
  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });

  const geocodingResponse = await fetch(geocodingUrl, { signal });

  if (!geocodingResponse.ok) {

    // todo display this in a better way
    throw new Error("Unable to find that city. Please try again.");
  }

  const locationData = await geocodingResponse.json();
  const location = locationData.results?.[0];
  if (!location) {
    // todo display this in a better way
    throw new Error("City not found. Please try another city name.");
  }

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current:
      "temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
    hourly:
      "temperature_2m,precipitation_probability,weather_code,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "10",
    wind_speed_unit: "ms",
    timezone: "auto",
  });

  const weatherResponse = await fetch(weatherUrl, { signal });
  if (!weatherResponse.ok) {

    // todo display this in a better way
    throw new Error("Unable to fetch weather for that city. Please try again.");
  }

  const weatherData = await weatherResponse.json();
  const current = weatherData.current;
  if (!current || !weatherData.hourly || !weatherData.daily) {
    // todo display this in a better way
    throw new Error("Current and forecast data is unavailable for that city.");
  }

  const condition = describeWeatherCode(current.weather_code, current.is_day);

  return {
    city: location.name,
    country: location.country || "",
    temperature: Math.round(current.temperature_2m),
    description: condition.description,
    icon: condition.icon,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    latitude: location.latitude,
    longitude: location.longitude,
    currentTime: current.time,
    hourly: weatherData.hourly,
    daily: weatherData.daily,
  };
}

function describeWeatherCode(code, isDay) {
  const conditions = {
    0: { description: "Clear sky", icon: isDay ? "☀️" : "🌙" },
    1: { description: "Mainly clear", icon: isDay ? "🌤️" : "🌙" },
    2: { description: "Partly cloudy", icon: "⛅" },
    3: { description: "Overcast", icon: "☁️" },
    45: { description: "Fog", icon: "🌫️" },
    48: { description: "Depositing rime fog", icon: "🌫️" },
    51: { description: "Light drizzle", icon: "🌦️" },
    53: { description: "Moderate drizzle", icon: "🌦️" },
    55: { description: "Dense drizzle", icon: "🌧️" },
    56: { description: "Light freezing drizzle", icon: "🌧️" },
    57: { description: "Dense freezing drizzle", icon: "🌧️" },
    61: { description: "Slight rain", icon: "🌧️" },
    63: { description: "Moderate rain", icon: "🌧️" },
    65: { description: "Heavy rain", icon: "🌧️" },
    66: { description: "Light freezing rain", icon: "🌧️" },
    67: { description: "Heavy freezing rain", icon: "🌧️" },
    71: { description: "Slight snow", icon: "🌨️" },
    73: { description: "Moderate snow", icon: "🌨️" },
    75: { description: "Heavy snow", icon: "❄️" },
    77: { description: "Snow grains", icon: "🌨️" },
    80: { description: "Slight rain showers", icon: "🌦️" },
    81: { description: "Moderate rain showers", icon: "🌧️" },
    82: { description: "Violent rain showers", icon: "🌧️" },
    85: { description: "Slight snow showers", icon: "🌨️" },
    86: { description: "Heavy snow showers", icon: "❄️" },
    95: { description: "Thunderstorm", icon: "⛈️" },
    96: { description: "Thunderstorm with slight hail", icon: "⛈️" },
    99: { description: "Thunderstorm with heavy hail", icon: "⛈️" },
  };

  return conditions[code] || { description: "Unknown conditions", icon: "🌡️" };
}

function renderWeatherData(weather, target) {
  const card = document.createElement("section");
  card.className =
    "weather-card rounded-xl bg-white/20 p-6 text-white shadow-lg backdrop-blur-md";

  const heading = document.createElement("div");
  heading.className = "flex items-center gap-3";

  const city = document.createElement("h2");
  city.className = "text-2xl font-semibold";
  city.textContent = `${weather.city}${weather.country ? `, ${weather.country}` : ""}`;
  heading.append(city);

  const icon = document.createElement("span");
  icon.className = "text-4xl";
  icon.textContent = weather.icon;
  icon.setAttribute("aria-hidden", "true");
  heading.append(icon);

  const temperature = document.createElement("p");
  temperature.className = "text-5xl font-bold mt-3";
  temperature.textContent = `${weather.temperature}°C`;

  const description = document.createElement("p");
  description.className = "capitalize text-lg mt-2";
  description.textContent = weather.description;

  const details = document.createElement("div");
  details.className = "mt-4 flex gap-6 text-sm opacity-80";

  const humidity = document.createElement("span");
  humidity.textContent = `Humidity: ${weather.humidity}%`;

  const wind = document.createElement("span");
  wind.textContent = `Wind: ${weather.windSpeed} m/s`;

  details.append(humidity, wind);
  card.append(heading, temperature, description, details);

  const hourlySection = document.createElement("section");
  hourlySection.className = "forecast-panel rounded-xl";
  hourlySection.setAttribute("aria-labelledby", "hourly-forecast-title");

  const hourlyTitle = document.createElement("h2");
  hourlyTitle.id = "hourly-forecast-title";
  hourlyTitle.className = "forecast-title";
  hourlyTitle.textContent = "Next 24 hours";

  const hourlyCards = document.createElement("div");
  hourlyCards.className = "hourly-forecast";
  const hourly = weather.hourly;
  const nextHours = hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => time >= weather.currentTime)
    .slice(0, 24);

  for (const { time, index } of nextHours) {
    const condition = describeWeatherCode(
      hourly.weather_code[index],
      hourly.is_day[index],
    );
    const hourCard = document.createElement("article");
    hourCard.className = "hourly-card";

    const hourTime = document.createElement("span");
    hourTime.className = "forecast-muted";
    hourTime.textContent = time.slice(11, 16);

    const hourIcon = document.createElement("span");
    hourIcon.className = "text-2xl";
    hourIcon.textContent = condition.icon;
    hourIcon.setAttribute("aria-hidden", "true");

    const hourTemperature = document.createElement("strong");
    hourTemperature.textContent = `${Math.round(hourly.temperature_2m[index])}°`;

    const precipitation = document.createElement("span");
    precipitation.className = "forecast-muted";
    precipitation.textContent = `${hourly.precipitation_probability[index] ?? 0}% rain`;

    hourCard.append(hourTime, hourIcon, hourTemperature, precipitation);
    hourlyCards.append(hourCard);
  }

  hourlySection.append(hourlyTitle, hourlyCards);

  const dailySection = document.createElement("section");
  dailySection.className = "forecast-panel rounded-xl";
  dailySection.setAttribute("aria-labelledby", "daily-forecast-title");

  const dailyTitle = document.createElement("h2");
  dailyTitle.id = "daily-forecast-title";
  dailyTitle.className = "forecast-title";
  dailyTitle.textContent = "10-day forecast";

  const dailyCards = document.createElement("div");
  dailyCards.className = "daily-forecast";
  const daily = weather.daily;

  for (let index = 0; index < daily.time.length; index += 1) {
    const condition = describeWeatherCode(daily.weather_code[index], true);
    const dayCard = document.createElement("article");
    dayCard.className = "daily-card";

    const date = document.createElement("span");
    date.className = "daily-date";
    date.textContent = new Date(`${daily.time[index]}T12:00:00`).toLocaleDateString(
      undefined,
      { weekday: "short", month: "short", day: "numeric" },
    );

    const summary = document.createElement("span");
    summary.className = "daily-condition";
    summary.textContent = `${condition.icon} ${condition.description}`;

    const temperatures = document.createElement("strong");
    temperatures.className = "daily-temperatures";
    temperatures.textContent =
      `${Math.round(daily.temperature_2m_max[index])}° / ` +
      `${Math.round(daily.temperature_2m_min[index])}°`;

    const dailyPrecipitation = document.createElement("span");
    dailyPrecipitation.className = "daily-precipitation forecast-muted";
    dailyPrecipitation.textContent =
      `${daily.precipitation_probability_max[index] ?? 0}% rain`;

    dayCard.append(date, summary, temperatures, dailyPrecipitation);
    dailyCards.append(dayCard);
  }

  dailySection.append(dailyTitle, dailyCards);

  const mapSection = document.createElement("section");
  mapSection.className = "forecast-panel location-map rounded-xl";

  const mapTitle = document.createElement("h2");
  mapTitle.className = "forecast-title";
  mapTitle.textContent = `Map · ${weather.city}`;

  const mapCanvas = document.createElement("div");
  mapCanvas.className = "location-map-canvas";
  mapCanvas.setAttribute("role", "region");
  mapCanvas.setAttribute("aria-label", `Map showing ${weather.city}`);
  mapSection.append(mapTitle, mapCanvas);

  disposeActiveMap();
  target.replaceChildren(card, hourlySection, dailySection, mapSection);
  activeMap = L.map(mapCanvas, { scrollWheelZoom: false }).setView(
    [weather.latitude, weather.longitude],
    12,
  );
  activeMap.attributionControl.setPrefix(false);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(activeMap);
  const markerPopup = document.createElement("span");
  markerPopup.textContent = weather.city;
  L.marker([weather.latitude, weather.longitude])
    .addTo(activeMap)
    .bindPopup(markerPopup);
}

function disposeActiveMap() {
  activeMap?.remove();
  activeMap = null;
}

function renderError(message, target) {
  disposeActiveMap();
  const container = document.createElement("section");
  container.className =
    "rounded-xl bg-red-500/20 p-6 text-white shadow-lg backdrop-blur-md";

  const error = document.createElement("p");
  error.className = "font-semibold";
  error.textContent = message;

  container.append(error);
  target.replaceChildren(container);
}