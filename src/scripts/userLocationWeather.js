import {showPosition} from "./utility/showPosition.js";
import {showError} from "./utility/showError.js";

export function userLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}



// this function gets the current location of the user and displays it for the very first time the user opens the application.

// might as well use this when the user clears the history.