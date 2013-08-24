function geolocation() {
    "use strict";

    if (!navigator.geolocation) {
        /*
            @TODO
            Mudar o alert para mensgens de erro para o usuário
        */
        alert("Geolocation is not supported by your browser");
        return;
    }

    function success(position) {
        return [position.coords.latitude, position.coords.longitude];
    }

    function error() {
        /*
            @TODO
            Mudar o alert para mensgens de erro para o usuário
        */
        alert("Unable to retrieve your location");
    }

    navigator.geolocation.getCurrentPosition(success, error);
}