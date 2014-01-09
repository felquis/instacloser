(function () {
    'use strict';

    var $icHeader = document.querySelector('.ic-header'),
        $icContent = document.querySelector('.ic-content'),
        querySelectorToArray = function (querySelector) {
            return Array.prototype.slice.call(querySelector);
        },

        /*
            Set .ic-content height based in .ic-header height to simulate position fixed
        */
        setContentHeight = {
            getHeight: function () {
                return window.innerHeight - $icHeader.offsetHeight;
            },
            setHeight: function (newHeight) {
                $icContent.style.height = newHeight + 'px';
            },
            set: function () {
                this.setHeight(this.getHeight());
            },
            setOnResize: function () {
                var time,
                    self = this;

                window.addEventListener('resize', function () {
                    clearTimeout(time);

                    time = setTimeout(function () {
                        self.set();
                    }, 300);
                });
            }
        },
        sections = {
            elements: document.querySelectorAll('.section'),
            current: '',
            hideAll: function () {
                querySelectorToArray(this.elements).forEach(function (element) {
                    element.classList.remove('show');
                });
            },
            show: function (className) {
                sections.hideAll();

                this.current = querySelectorToArray(this.elements).filter(function (element) {
                    if (element.classList.contains(className) === true) {
                        return element;
                    }
                })[0];

                this.current.classList.add('show');
            }
        },
        instagram = {
            init: function () {
                instagram.saveAccessToken();

                if (instagram.hasAccessToken()) {
                    instagram.loadPictures();
                } else {
                    sections.show('section-login');
                }
            },
            geoOptions: function () {
                return {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                };
            },
            geoCurrent: {},
            geoSuccess: function (res, callback) {
                instagram.geoCurrent = res.coords;

                if ($.isFunction(callback)) {
                    callback(true);
                }
            },
            geoError: function (error, callback) {

                if ($.isFunction(callback)) {
                    callback(false, error);
                } else {
                    // MDN REF: https://developer.mozilla.org/en-US/docs/Web/API/PositionError
                    if (error.code === 1) {
                        alert('You must accept the geolocation to use the application');
                    } else if (error.code === 2) {
                        alert('Your position is unavailable');
                    } else if (error.code === 3) {
                        alert('Your position is taking too long');
                    }
                }
            },
            watchGeolocation: function (callback) {
                instagram.geoWatchID = navigator.geolocation.watchPosition(
                    function (res) {
                        instagram.geoSuccess(res, callback);
                    },
                    function (error) {
                        instagram.geoError(error, callback);
                    },
                    instagram.geoOptions()
                );
            },
            geoCurrentPosition: function (callback) {

                instagram.watchGeolocation();

                navigator.geolocation.getCurrentPosition(
                    function (res) {
                        instagram.geoSuccess(res, callback);
                    },
                    function (error) {
                        instagram.geoError(error, callback);
                    },
                    instagram.geoOptions()
                );
            },
            processHTML: function (data) {
                var $item, $img, $local, distance = '',
                    $itemsList = $('<ul>').addClass('pictures-list');

                $.each(data.data, function () {

                    distance = instagram.calcDistance(this.location.latitude, this.location.longitude);

                    $item = $('<li>').addClass('pictures-list-item media-type-' + this.type);

                    $img = $('<img>').attr('src', this.images.standard_resolution.url);

                    $local = $('<div class="local">@' + this.user.username + ' is ' + distance + ' away</div>');

                    $item.append($local);
                    $item.append($img);

                    $itemsList.append($item);
                });

                return $itemsList;
            },
            loadPictures: function () {

                instagram.geoCurrentPosition(function (success) {
                    if (success) {
                        $.ajax({
                            url: 'https://api.instagram.com/v1/media/search',
                            dataType: 'jsonp',
                            data: {
                                lat: instagram.geoCurrent.latitude,
                                lng: instagram.geoCurrent.longitude,
                                access_token: localStorage['ic-instagram-token']
                            },
                            success: function (success) {
                                if (success.meta.code === 200) {
                                    $('.section-photo-list').html(instagram.processHTML(success));

                                    sections.show('section-photo-list');
                                }
                            },
                            error: function (error) {
                                alert('Something is wrong, but I don\'t know what');

                                console.log('error', error);
                            }
                        });
                    } else {
                        console.log('We can\'t load pictures!');
                    }
                });

            },
            hasAccessToken: function () {
                return !!localStorage['ic-instagram-token'];
            },
            onAccessExpires: function (res, callback) {
                if (res.meta.code === 400) {

                    if ((!!localStorage['ic-instagram-token']) === true) {
                        location.hash = '';

                        localStorage['ic-instagram-token'] = '';

                        alert('Your access on InstaCloser has expired, login again.');
                    } else {
                        location.hash = '';
                    }

                    sections.show('section-login');
                }

                if (typeof callback === 'function') {
                    callback(res);
                }
            },
            onUnexpectedAjaxError: function (err) {

                if (navigator.onLine === false) {
                    alert('You are offline :/');

                    /* NEXT: Add offline screen with a reload button */
                } else {
                    console.log('something is wrong, I do not know what', err);
                }

                location.hash = '';

                alert('Ooops, something is wrong, try login again');

                sections.show('section-login');
            },
            hasValidAccessToken: function () {
                $.ajax({
                    url: 'https://api.instagram.com/v1/users/self/feed',
                    dataType: 'jsonp',
                    data: {
                        access_token: localStorage['ic-instagram-token'],
                        count: 1
                    },
                    success: function (res) {
                        instagram.onAccessExpires(res);
                    },
                    error: function (err) {
                        instagram.onUnexpectedAjaxError(err);
                    }
                });
            },
            saveAccessToken: function () {
                if (!localStorage['ic-instagram-token']) {
                    localStorage['ic-instagram-token'] = location.hash.replace(/^#[\w\W]*(access_token=([\.\d\w]+))[\w\W]*$/i, '$2');
                }

                instagram.hasValidAccessToken();
            },
            calcDistance: function (lat, lng, unit) {
                var radlat1 = Math.PI * instagram.geoCurrent.latitude / 180,
                    radlat2 = Math.PI * lat / 180,

                    theta = instagram.geoCurrent.longitude - lng,
                    radtheta = Math.PI * theta / 180,
                    dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

                dist = Math.acos(dist);
                dist = dist * 180 / Math.PI;
                dist = dist * 60 * 1.1515;

                unit = (unit !== 'N') ? 'K' : unit;

                if (unit === 'K') {
                    dist = dist * 1.609344;
                }

                if (unit === 'N') {
                    dist = dist * 0.8684;
                }

                if (dist < 1) {
                    dist = Math.round(dist * 1000) + 'm';
                } else {
                    dist = dist.toFixed(2) + 'Km';
                }

                return dist;
            }
        };

    /*
        Init functions
    */
    setContentHeight.set();
    setContentHeight.setOnResize();

    sections.show('section-loading');
    instagram.init();
}(document, window));