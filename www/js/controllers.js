angular.module('starter.controllers', ['ngCordova'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $state) {
  if (!!localStorage['ic-instagram-token']) {
    $scope.logged = true;
    $scope.loginPhrase = 'Logout'
  } else {
    $scope.logged = false;
    $scope.loginPhrase = 'Login'
  }

  $scope.loginOrDie = function(event) {
    if (!!localStorage['ic-instagram-token']) {
      localStorage.removeItem('ic-instagram-token');
      $state.go('app.login');
      $scope.logged = true;
      $scope.loginPhrase = 'Login'
    } else {
      $state.go('app.login');
    }
  }
})

.controller('LoginCtrl', function ($scope, $state) {
  console.log('LoginCtrl');

  $scope.loading = false;

  $scope.onClickLogin = function () {
    $scope.loading = true;
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

    $cordovaGeolocation.getCurrentPosition().then(function(position) {
      $scope.loadMore(position.coords);
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

      console.log(success.data);
    })
    .error(function (err) {
      console.log(err);
      $scope.loading = false;
    })
  }

  $scope.getPositionAndLoadContent();
});
