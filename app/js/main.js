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
            loadPictures: function () {

                instagram.geoCurrentPosition(function (success) {
                    if (success) {
                        console.log('Load pictures \\o/!');
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
                if (localStorage['ic-instagram-token']) {
                    instagram.hasValidAccessToken();
                } else {
                    localStorage['ic-instagram-token'] = location.hash.replace(/^#[\w\W]*(access_token=([\.\d\w]+))[\w\W]*$/i, '$2');
                }
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