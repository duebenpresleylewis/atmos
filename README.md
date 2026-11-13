# Atmos

### Weather, with a little more atmosphere.

Atmos is a responsive weather dashboard for checking current conditions, the next 24 hours, and a 10-day forecast. Weather-matched video and image backgrounds bring a little of the sky into the forecast.

[**Open Atmos**](https://duebenpresleylewis.github.io/atmos/) | [GitHub profile](https://github.com/duebenpresleylewis)

---

## What you can do

- Search for a city with debounced autocomplete and keyboard-friendly suggestions.
- Check current conditions, including temperature, humidity, and wind.
- Browse the next 24 hours and a 10-day forecast.
- Switch between Celsius and Fahrenheit; your choice is remembered in the browser.
- View the searched location on an interactive map.
- Enjoy weather-matched video backgrounds with image fallbacks.
- Use the interface on desktop or mobile.

## Built with

- [Vite](https://vite.dev/) and JavaScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Open-Meteo](https://open-meteo.com/) for weather and geocoding data
- [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles

No API key is required for weather or geocoding.

## Run locally

You will need [Node.js](https://nodejs.org/) and npm.

```bash
git clone https://github.com/duebenpresleylewis/atmos.git
cd atmos
npm ci
npm run dev
```

Vite prints the local URL when the development server starts.

## Build

```bash
npm run build
npm run preview
```

The production site is generated in `dist/`.

## Deploy to GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys the site when changes are pushed to `main`. You can also run it manually from the repository's **Actions** tab.

For the first deployment, open **Settings > Pages** and set the source to **GitHub Actions**. The build automatically uses the `/atmos/` base path on GitHub Actions so site assets resolve correctly on the project page.

## Credits

- Weather and geocoding data: [Open-Meteo](https://open-meteo.com/)
- Map tiles and map data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
