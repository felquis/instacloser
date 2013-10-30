function geolocation(f) {
    'use strict';

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    function success(position) {
        var geo = {
            'lat': position.coords.latitude,
            'lng': position.coords.longitude
        };

        f(geo);
    }

    function error() {
        alert('Unable to retrieve your location');
    }

    navigator.geolocation.getCurrentPosition(success, error);
}