import "./style.css";
import "./styles/header.css";
import "./styles/weather-info.css";
import { searchAnimation } from "./scripts/searchAnimation.js";
import initWeatherSearch from "./scripts/weatherSearch.js";
import {userLocationWeather} from "./scripts/userLocationWeather.js";

searchAnimation();
initWeatherSearch();
userLocationWeather();

// functions


// event listeners
