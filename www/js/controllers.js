angular.module('starter.controllers', ['ngCordova'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $state, $ionicPopover) {

  $scope.checkAccessToken = function () {
    if (!!localStorage['ic-instagram-token']) {
      $scope.logged = true;
      $scope.loginPhrase = 'Logout'
    } else {
      $scope.logged = false;
      $scope.loginPhrase = 'Login'
    }
  };

  $scope.checkAccessToken();

  $scope.loginOrDie = function(event) {
    if (!!localStorage['ic-instagram-token']) {
      localStorage.removeItem('ic-instagram-token');
      $state.go('app.login');
      $scope.logged = true;
      $scope.loginPhrase = 'Login';
    } else {
      $state.go('app.login');
    }
  }

  $ionicPopover.fromTemplateUrl('templates/popover-menu.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.openPopover = function($event) {
    $scope.popover.show($event);
  };

  $scope.closePopover = function() {
    $scope.popover.hide();
  };

  // Cleanup the popover when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  if (location.host === 'localhost:8080') {
    $scope.client_id = 'a2dadbd1d44f4e4a869d3fd3ab8543fc';
    $scope.baseURL = location.protocol + '//' + location.host;
  } else {
    // instacloser.com
    $scope.client_id = '05d5219366e24a3bb9f4d7eec6427e52';
    $scope.baseURL = 'http://instacloser.com';
  }

  $scope.redirect_uri = encodeURIComponent($scope.baseURL + '/login.html');
})

.controller('LoginCtrl', function ($scope, $state) {
  /*
    TODO:
      To logout a user try open an InAppBrowser to > https://instagram.com/accounts/logout/
      and delete localStorage['ic-instagram-token']

      Next time, the user will need to login again
  */

  $scope.loading = false;

  window.popup = '';

  $scope.onClickLogin = function (event) {

    $scope.loading = true;

    var width = 380,
        height = 400,
        left = (window.outerWidth / 2) - (width / 2),
        top = (window.outerHeight / 2) - (height / 2);

    popup = window.open('https://instagram.com/oauth/authorize/?client_id=' + $scope.client_id + '&amp;redirect_uri=' + $scope.redirect_uri + '&amp;response_type=token', '_blank', 'location=yes,resizable=1,width='+ width +',height=' + height + ',top=' + top + ',left=' + left);

    // On unLoad save the access_token in localStorage
    popup.onunload = function (event) {
      if (popup.location.hash.indexOf('#access_token=') !== -1) {
        if (!!localStorage['ic-instagram-token']) {
          // If exist, do not do nothing.
        } else {
          localStorage['ic-instagram-token'] = popup.location.hash.replace(/^#[\w\W]*(access_token=([\.\d\w]+))[\w\W]*$/i, '$2');
        }

        $scope.checkAccessToken();

        $state.go('app.nearby');
      }
    }

    // Popup will ask to be closed
    // It works on desktop and mobile browsers (not an app)
    window.addEventListener('message', function(event) {
      if (event.origin === $scope.baseURL) {
        popup.close();

        window.removeEventListener('message');
      }
    });

    // It works for Android/iOS built app
    popup.addEventListener('loadstart', function (event) {
      if (event.url.indexOf($scope.baseURL) > -1) {

        var url = event.url.split('login.html')

        localStorage['ic-instagram-token'] = url[1].replace(/^#[\w\W]*(access_token=([\.\d\w]+))[\w\W]*$/i, '$2');

        $scope.checkAccessToken();

        popup.close();

        $state.go('app.nearby');
      }
    });
  }
})

.controller('NearbyCtrl', function ($scope, $http, $state, $cordovaGeolocation, $ionicScrollDelegate) {

  if (!localStorage['ic-instagram-token']) {
    $state.go('app.login');

    return
  }

  $scope.loadedItems = [];
  $scope.loading = false;

  $scope.getPositionAndLoadContent = function () {

    $scope.loading = true;
    $scope.loadedItems = [];
    $scope.coords;

    $cordovaGeolocation.getCurrentPosition().then(function(position) {
      $scope.loadMore(position.coords);
      $scope.coords = position.coords;
      $ionicScrollDelegate.scrollTop();
    }, function(err) {
      console.error('Algo deu errado no getCurrentPosition', err);
    });
  }

  $scope.loadMore = function (coords) {
    $http({
      method: 'jsonp',
      url: ['https://api.instagram.com/v1/media/search?lat=' + coords.latitude,
        'lng=' + coords.longitude,
        'distance=5000',
        'access_token=' + localStorage['ic-instagram-token'],
        'callback=JSON_CALLBACK'].join('&')
    })
    .success(function(success) {
      $scope.loadedItems = success.data;
      $scope.loading = false;
    })
    .error(function (err) {
      console.log(err);
      $scope.loading = false;
    })
  }

  $scope.getPositionAndLoadContent();
})

.controller('ConfigCtrl', function ($scope) {

});
