# Atmos TODO

- [ ] Prevent stale weather searches from overwriting newer results (cancel the previous request or ignore responses from older searches).
- [ ] Protect the OpenWeather API key. A `VITE_` variable is included in the browser bundle; use a restricted key or a backend if it must remain secret.
- [ ] Render API-provided weather and error text as text instead of interpolating it into `innerHTML`.
- [ ] Decide whether to fetch current weather on page load; the initial values in `index.html` are static.
