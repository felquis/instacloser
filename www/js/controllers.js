angular.module('starter.controllers', [])

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

.controller('NearbyCtrl', function ($scope, $http, $state) {

  if (!localStorage['ic-instagram-token']) {
    $state.go('app.login');

    return
  }

  $scope.loadedItems = [];

  $scope.loadMore = function (nextPage) {
    $http({
      method: 'jsonp',
      url: ['https://api.instagram.com/v1/media/search?lat=48.858844',
        'lng=2.294351',
        'distance=5000',
        'access_token=' + localStorage['ic-instagram-token'],
        'callback=JSON_CALLBACK'].join('&')
    })
    .success(function(success) {
      console.log(success);
      $scope.loadedItems = success.data;
    })
    .error(function (err) {
      console.log(err);
    })
  }

  $scope.loadMore();
});
