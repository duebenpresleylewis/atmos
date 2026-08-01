export default function initWeatherSearch() {}

const input = document.querySelector(".search-input");
input.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    const searchTerm = input.value.trim();
    if (searchTerm !== "") {
      // Call the function to fetch weather data for the search term
      fetchWeatherData(searchTerm);
    }
  }
});

async function fetchWeatherData(city) {
  // Replace this with your actual API call to fetch weather data
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY; // Use the API key from the .env file

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    const response = await fetch(url).then((res) => {
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json();
    });
    
    const data = await response;
    console.log(data);


//     console.log(data.name);
// console.log(data.main.temp);
// console.log(data.main.humidity);
// console.log(data.wind.speed);
// console.log(data.weather[0].main);
// console.log(data.weather[0].description);
// console.log(data.weather[0].icon);
  // Example: You can use fetch() to call your weather API here
}
