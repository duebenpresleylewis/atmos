export default function initWeatherSearch() {
  const input = document.querySelector("#search-input");
  const weatherDashboard = document.querySelector(".weather-dashboard");

  if (!input || !weatherDashboard) {
    return;
  }

  input.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const city = input.value.trim();
    if (!city) {
      renderError("Please enter a city name.", weatherDashboard);
      return;
    }

    weatherDashboard.innerHTML = "<p>Loading weather...</p>";

    try {
      const weather = await fetchWeatherData(city);
      renderWeatherData(weather, weatherDashboard);
    } catch (error) {
      renderError(error.message, weatherDashboard);
    }
  });
}

async function fetchWeatherData(city) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("Weather API key is not configured.");
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);

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
  const iconUrl = weather.icon
    ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png`
    : "";

  target.innerHTML = `
    <section class="weather-card rounded-xl bg-white/20 p-6 text-white shadow-lg backdrop-blur-md">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-semibold">${weather.city}${weather.country ? `, ${weather.country}` : ""}</h2>
        ${iconUrl ? `<img src="${iconUrl}" alt="${weather.description}" class="w-14 h-14" />` : ""}
      </div>
      <p class="text-5xl font-bold mt-3">${weather.temperature}°C</p>
      <p class="capitalize text-lg mt-2">${weather.description}</p>
      <div class="mt-4 flex gap-6 text-sm opacity-80">
        <span>Humidity: ${weather.humidity}%</span>
        <span>Wind: ${weather.windSpeed} m/s</span>
      </div>
    </section>
  `;
}

function renderError(message, target) {
  target.innerHTML = `
    <section class="rounded-xl bg-red-500/20 p-6 text-white shadow-lg backdrop-blur-md">
      <p class="font-semibold">${message}</p>
    </section>
  `;
}