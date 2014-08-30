angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

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
