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

                ga('send', 'event', 'geoAccuracy', res.coords.accuracy);

                if ($.isFunction(callback)) {
                    callback(true);
                }
            },
            geoError: function (error, callback) {

                if ($.isFunction(callback)) {
                    callback(false, error);
                }

                // MDN REF: https://developer.mozilla.org/en-US/docs/Web/API/PositionError
                if (error.code === 1) {
                    ga('send', 'event', 'geoError', 'PERMISSION_DENIED');

                    alert('You must accept the geolocation to use the application');
                } else if (error.code === 2) {
                    ga('send', 'event', 'geoError', 'POSITION_UNAVAILABLE');

                    alert('Your position is unavailable');
                } else if (error.code === 3) {
                    ga('send', 'event', 'geoError', 'TIMEOUT');

                    alert('Your position is taking too long');
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
                var $itemsList = $('<ul>').addClass('pictures-list'),

                    createItem = function (media) {
                        var distance = instagram.calcDistance(media.location.latitude, media.location.longitude),
                            $img,
                            $local,
                            $item = $('<li>').addClass('pictures-list-item media-type-' + media.type);

                        if (media.type === 'video') {
                            $item.attr('data-video-file', media.videos.low_resolution.url);
                        }

                        $img = $('<img>').attr('src', media.images.standard_resolution.url);

                        $local = $('<div class="local">@' + media.user.username + ' is ' + distance + ' away</div>');

                        $item.append($local);
                        $item.append($img);

                        return $item;
                    };

                $.each(data.data, function () {
                    $itemsList.append(createItem(this));
                });

                return $itemsList;
            },
            loadPictures: function () {

                var startDate = new Date().getTime();

                instagram.geoCurrentPosition(function (success) {
                    if (success) {

                        ga('send', 'event', 'instagramAPI', 'v1/media/search', 'call');

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

                                    instagram.createVideos();

                                    sections.show('section-photo-list');

                                    ga('send', 'event', 'instagramAPI', 'v1/media/search', 'call-success');
                                }
                            },
                            error: function () {
                                alert('Something is wrong, but I don\'t know what');

                                ga('send', 'event', 'instagramAPI', 'v1/media/search', 'call-error');
                            },
                            complete: function () {
                                var endDate = new Date().getTime(),
                                    secondsToLoad = (endDate - startDate) / 1000;

                                ga('send', 'event', 'instagramAPI', 'v1/media/search', secondsToLoad.toFixed(1));
                            }
                        });
                    } else {
                        ga('send', 'event', 'instagramAPI', 'We can\'t load pictures');
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

                        ga('send', 'event', 'instagramAPI', 'access-expired');

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
            onUnexpectedAjaxError: function () {

                if (navigator.onLine === false) {
                    ga('send', 'event', 'offline');

                    alert('You are offline :/');

                    return false;

                    /* NEXT: Add offline screen with a reload button */
                }

                location.hash = '';

                alert('Ooops, something is wrong, try login again');
                ga('send', 'event', 'unknown-error', 'try-login-again');

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
            },
            createVideos: function () {
                var $video, $source, videoID;

                $('.media-type-video').each(function (i, elem) {
                    $video = $('<video>');
                    $source = $('<source />');
                    videoID = 'videojs-' + i + '-' + (new Date()).getTime();

                    $source.attr({
                        src: $(this).attr('data-video-file'),
                        type: 'video/mp4'
                    });

                    $video.attr({
                        'id': videoID
                    });

                    $video.addClass('video-js video vjs-default-skin');

                    $video.append($source);

                    $(elem).append($video);

                    videojs(videoID, {
                        controls: true,
                        autoplay: false,
                        preload: 'none',
                        poster: $(this).find('img').get(0).src
                    });
                });
            }
        };

    /*
        Init functions
    */
    setContentHeight.set();
    setContentHeight.setOnResize();

    videojs.options.flash.swf = location.protocol + '//' + location.host + '/swf/video-js.swf';

    sections.show('section-loading');
    instagram.init();
}(document, window));