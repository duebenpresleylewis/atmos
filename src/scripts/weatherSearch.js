export default function initWeatherSearch() {
  const input = document.querySelector("#search-input");
  const weatherResults = document.querySelector(".weather-results");

  if (!input || !weatherResults) {
    return;
  }

  let activeController = null;
  let latestRequestId = 0;

  input.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    activeController?.abort();
    activeController = null;
    const requestId = ++latestRequestId;
    const city = input.value.trim();
    if (!city) {
      renderError("Please enter a city name.", weatherResults);
      return;
    }

    const controller = new AbortController();
    activeController = controller;
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
  });
}

async function fetchWeatherData(city, signal) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("Weather API key is not configured.");
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("OpenWeather rejected the request. Check your API key.");
    }

    if (response.status === 404) {
      throw new Error("City not found. Please try another city name.");
    }

    const errorData = await response.json().catch(() => null);
    const message = errorData?.message || "Unable to fetch weather for that city.";
    throw new Error(message);
  }

  const data = await response.json();

  return {
    city: data.name,
    country: data.sys?.country || "",
    temperature: Math.round(data.main?.temp ?? 0),
    description: data.weather?.[0]?.description || "No description available",
    icon: data.weather?.[0]?.icon || "",
    humidity: data.main?.humidity ?? 0,
    windSpeed: data.wind?.speed ?? 0,
  };
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

  if (weather.icon) {
    const icon = document.createElement("img");
    icon.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
    icon.alt = weather.description;
    icon.className = "w-14 h-14";
    heading.append(icon);
  }

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

  target.replaceChildren(card);
}

function renderError(message, target) {
  const container = document.createElement("section");
  container.className =
    "rounded-xl bg-red-500/20 p-6 text-white shadow-lg backdrop-blur-md";

  const error = document.createElement("p");
  error.className = "font-semibold";
  error.textContent = message;

  container.append(error);
  target.replaceChildren(container);
}