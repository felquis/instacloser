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

      console.log(success.data);
    })
    .error(function (err) {
      console.log(err);
      $scope.loading = false;
    })
  }

  $scope.getPositionAndLoadContent();

  var cardInfo, defaultWidth, parentGesture, defaultWidthHalf;

  $scope.cardDragLeft = function(event) {
    parentGesture = event;

    // Only change card's left if open is different of true
    if (cardInfo.data('open') === true) {
      return;
    }

    cardInfo.css('left', (defaultWidth - event.gesture.distance) + 'px');
  }

  $scope.cardDragRight = function(event) {
    parentGesture = event;

    // Only change card's left if open is different of false
    if (cardInfo.data('open') === false) {
      return;
    }

    cardInfo.css('left', event.gesture.distance + 'px');
  }

  $scope.dragStart = function (event) {
    cardInfo = angular.element(event.currentTarget.querySelector('.ic-card-info')),
    defaultWidth = parseFloat(cardInfo.data('width'));
    defaultWidthHalf = defaultWidth / 2;
  }

  $scope.dragRelease = function (event) {
    if (parentGesture.type === 'swipeleft' || parentGesture.type === 'swiperight') {
      return
    }

    if (defaultWidthHalf < parentGesture.gesture.distance) {
      finishAnimationTo[parentGesture.gesture.direction](event);
    } else {
      if (parentGesture.gesture.direction === 'left') {
        finishAnimationTo.right(event);
      } else if (parentGesture.gesture.direction === 'right') {
        if ( cardInfo.data('open') === false && event.type !== 'release') {
          finishAnimationTo.left(event);
        } else if (cardInfo.data('open') === true) {
          finishAnimationTo.left(event);
        }
      }
    }
  }

  $scope.swipeLeft = function (event) {
    parentGesture = event;

    finishAnimationTo.left(event);
  }

  $scope.swipeRight = function (event) {
    parentGesture = event;

    finishAnimationTo.right(event);
  }

  var finishAnimationTo = {
    right: function (event) {
      cardInfo.data('open', false);

      move(cardInfo[0])
        .add('left', defaultWidth)
        .end();
    },
    left: function(event) {
      cardInfo.data('open', true);

      move(cardInfo[0])
        .set('left', 0)
        .end();
    }
  }
});
