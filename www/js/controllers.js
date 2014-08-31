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

.controller('NearbyCtrl', function () {
  console.log('NearbyCtrl');


});
