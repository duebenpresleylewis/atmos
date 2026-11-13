import L from "leaflet";
import "leaflet/dist/leaflet.css";

let activeMap = null;

export default function initWeatherSearch() {
  const input = document.querySelector("#search-input");
  const weatherResults = document.querySelector(".weather-results");
  const searchContainer = input?.closest("[data-search-container]");

  if (!input || !weatherResults || !searchContainer) {
    return;
  }

  const suggestions = document.createElement("ul");
  suggestions.id = "city-suggestions";
  suggestions.className = "city-suggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.setAttribute("aria-label", "City suggestions");
  suggestions.hidden = true;
  searchContainer.append(suggestions);

  let activeController = null;
  let suggestionsController = null;
  let suggestionTimeout = null;
  let locations = [];
  let activeSuggestionIndex = -1;
  let latestRequestId = 0;

  async function loadWeather(city, location) {
    activeController?.abort();
    activeController = null;
    suggestionsController?.abort();
    window.clearTimeout(suggestionTimeout);
    closeSuggestions();

    const requestId = ++latestRequestId;
    weatherResults.removeAttribute("aria-busy");
    if (!city) {
      renderError(
        "Check your search",
        "Please enter a city name.",
        weatherResults,
      );
      return;
    }

    const controller = new AbortController();
    activeController = controller;

    disposeActiveMap();
    weatherResults.setAttribute("aria-busy", "true");
    renderLoading(weatherResults);

    try {
      const weather = await fetchWeatherData(city, controller.signal, location);
      if (requestId !== latestRequestId) {
        return;
      }

      renderWeatherData(weather, weatherResults);
    } catch (error) {
      if (error.name === "AbortError" || requestId !== latestRequestId) {
        return;
      }

      renderError(
        "Weather unavailable",
        "Please try again later.",
        weatherResults,
        () => loadWeather(city, location),
      );
    } finally {
      if (requestId === latestRequestId) {
        activeController = null;
        weatherResults.removeAttribute("aria-busy");
      }
    }
  }

  function closeSuggestions() {
    suggestions.hidden = true;
    activeSuggestionIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function selectSuggestion(index) {
    const location = locations[index];
    if (!location) {
      return;
    }

    input.value = location.name;
    loadWeather(location.name, location);
  }

  function renderSuggestions(results) {
    locations = results;
    activeSuggestionIndex = -1;
    suggestions.replaceChildren();

    if (results.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.className = "city-suggestion-message";
      emptyState.textContent = "No matching cities found.";
      emptyState.setAttribute("role", "presentation");
      suggestions.append(emptyState);
      suggestions.hidden = false;
      input.setAttribute("aria-expanded", "true");
      input.removeAttribute("aria-activedescendant");
      return;
    }

    results.forEach((location, index) => {
      const item = document.createElement("li");
      item.setAttribute("role", "presentation");

      const option = document.createElement("button");
      option.id = `city-suggestion-${index}`;
      option.type = "button";
      option.className = "city-suggestion";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.index = String(index);

      const name = document.createElement("span");
      name.className = "city-suggestion-name";
      name.textContent = location.name;

      const details = document.createElement("span");
      details.className = "city-suggestion-details";
      details.textContent = [location.admin1, location.country]
        .filter(Boolean)
        .join(", ");

      option.append(name, details);
      item.append(option);
      suggestions.append(item);
    });

    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function setActiveSuggestion(index) {
    const options = suggestions.querySelectorAll('[role="option"]');
    if (options.length === 0) {
      return;
    }

    activeSuggestionIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      const isActive = optionIndex === activeSuggestionIndex;
      option.setAttribute("aria-selected", String(isActive));
      option.classList.toggle("is-active", isActive);
    });
    input.setAttribute(
      "aria-activedescendant",
      `city-suggestion-${activeSuggestionIndex}`,
    );
    options[activeSuggestionIndex].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("input", () => {
    suggestionsController?.abort();
    suggestionsController = null;
    window.clearTimeout(suggestionTimeout);

    const query = input.value.trim();
    if (query.length < 2) {
      locations = [];
      closeSuggestions();
      return;
    }

    suggestionTimeout = window.setTimeout(async () => {
      const controller = new AbortController();
      suggestionsController = controller;

      try {
        const results = await searchLocations(query, controller.signal);
        if (input.value.trim() === query) {
          renderSuggestions(results);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        locations = [];
        renderSuggestionMessage("City suggestions are unavailable.");
      } finally {
        if (suggestionsController === controller) {
          suggestionsController = null;
        }
      }
    }, 300);
  });

  function renderSuggestionMessage(message) {
    suggestions.replaceChildren();
    const item = document.createElement("li");
    item.className = "city-suggestion-message";
    item.setAttribute("role", "presentation");
    item.textContent = message;
    suggestions.append(item);
    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
  }

  suggestions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-index]");
    if (option) {
      selectSuggestion(Number(option.dataset.index));
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !suggestions.hidden) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestionIndex + 1);
      return;
    }
    if (event.key === "ArrowUp" && !suggestions.hidden) {
      event.preventDefault();
      setActiveSuggestion(
        activeSuggestionIndex < 0
          ? suggestions.querySelectorAll('[role="option"]').length - 1
          : activeSuggestionIndex - 1,
      );
      return;
    }
    if (event.key === "Escape" && !suggestions.hidden) {
      event.stopPropagation();
      closeSuggestions();
      return;
    }
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (activeSuggestionIndex >= 0 && !suggestions.hidden) {
      selectSuggestion(activeSuggestionIndex);
    } else {
      loadWeather(input.value.trim());
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!searchContainer.contains(document.activeElement)) {
        closeSuggestions();
      }
    }, 100);
  });

  document.addEventListener("click", (event) => {
    if (!searchContainer.contains(event.target)) {
      closeSuggestions();
    }
  });

  loadWeather("Kyoto");
}

async function searchLocations(query, signal) {
  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.search = new URLSearchParams({
    name: query,
    count: "5",
    language: "en",
    format: "json",
  });

  const geocodingResponse = await fetch(geocodingUrl, { signal });
  if (!geocodingResponse.ok) {
    throw new Error("Unable to fetch city suggestions.");
  }

  const locationData = await geocodingResponse.json();
  return locationData.results || [];
}

async function fetchWeatherData(city, signal, selectedLocation) {
  const location =
    selectedLocation || (await searchLocations(city, signal))[0];
  if (!location) {
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

    throw new Error("Unable to fetch weather for that city. Please try again.");
  }

  const weatherData = await weatherResponse.json();
  const current = weatherData.current;
  if (!current || !weatherData.hourly || !weatherData.daily) {
    throw new Error("Current and forecast data is unavailable for that city.");
  }

  const condition = describeWeatherCode(current.weather_code, current.is_day);
  const scene = getWeatherScene(current.weather_code, current.wind_speed_10m);

  return {
    city: location.name,
    country: location.country || "",
    temperature: Math.round(current.temperature_2m),
    description: condition.description,
    icon: condition.icon,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    scene,
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

function getWeatherScene(code, windSpeed) {
  if ([95, 96, 99].includes(code)) {
    return "thunderstorm";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return "drizzle";
  }
  if ([45, 48].includes(code)) {
    return "foggy";
  }
  if ([0, 1, 2, 3].includes(code) && windSpeed >= 10) {
    return "windy";
  }
  if (code === 3) {
    return "cloudy";
  }
  if (code === 2) {
    return "partly-cloudy";
  }
  if (code === 0 || code === 1) {
    return "sunny";
  }
  return windSpeed >= 10 ? "windy" : "partly-cloudy";
}

function setWeatherBackground(sceneName) {
  const dashboard = document.querySelector(".weather-dashboard");
  const video = dashboard?.querySelector("video");
  if (!dashboard || !video) {
    return;
  }

  const scene = {
    sunny: { video: "sunny", image: "sunny" },
    "partly-cloudy": { video: "partly-cloudy", image: "partly-cloudy" },
    cloudy: { video: "cloudy", image: "cloudy" },
    foggy: { video: "foggy", image: "fog" },
    drizzle: { video: "drizzle", image: "drizzle" },
    rain: { video: "rain", image: "rain" },
    snow: { video: "snow", image: "snow" },
    thunderstorm: { video: "thunderstorm", image: "thunderstorm" },
    windy: { video: "windy", image: "windy" },
    haze: { video: "haze", image: "haze" },
  }[sceneName];

  if (!scene) {
    throw new Error(`No background assets configured for weather scene: ${sceneName}`);
  }

  const fallbackImage = `/fallback-images/${scene.image}.jpg`;
  dashboard.style.backgroundImage = `url("${fallbackImage}")`;
  video.poster = fallbackImage;
  video.hidden = false;
  video.onerror = () => {
    video.hidden = true;
  };
  video.src = `/videos/${scene.video}.webm`;
  video.load();
}

function renderWeatherData(weather, target) {
  setWeatherBackground(weather.scene);

  const card = document.createElement("section");
  card.className = "weather-card text-white";

  const heading = document.createElement("div");
  heading.className = "weather-heading flex items-center gap-3";

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
  details.className = "weather-card-details mt-4 flex gap-6 text-sm opacity-80";

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

function renderLoading(target) {
  const container = document.createElement("section");
  container.className = "weather-loading";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-label", "Loading weather forecast");

  const surface = document.createElement("div");
  surface.className = "weather-loading__surface";

  const animation = document.createElement("div");
  animation.className = "weather-loading__animation";
  animation.setAttribute("aria-hidden", "true");

  const orbit = document.createElement("span");
  orbit.className = "weather-loading__orbit";
  const core = document.createElement("span");
  core.className = "weather-loading__core";
  animation.append(orbit, core);

  const title = document.createElement("p");
  title.className = "weather-loading__title";
  title.textContent = "Gathering your forecast";

  const detail = document.createElement("p");
  detail.className = "weather-loading__detail";
  detail.textContent = "Checking the latest conditions";

  surface.append(animation, title, detail);
  container.append(surface);
  target.replaceChildren(container);
}

function renderError(titleText, message, target, onRetry) {
  disposeActiveMap();
  const container = document.createElement("section");
  container.className = "weather-error";
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "assertive");

  const surface = document.createElement("div");
  surface.className = "weather-error__surface";

  const icon = document.createElement("span");
  icon.className = "weather-error__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "!";

  const title = document.createElement("h2");
  title.className = "weather-error__title";
  title.textContent = titleText;

  const error = document.createElement("p");
  error.className = "weather-error__message";
  error.textContent = message;

  surface.append(icon, title, error);
  if (onRetry) {
    const retry = document.createElement("button");
    retry.className = "weather-error__retry";
    retry.type = "button";
    retry.textContent = "Try again";
    retry.addEventListener("click", onRetry);
    surface.append(retry);
  }

  container.append(surface);
  target.replaceChildren(container);
}