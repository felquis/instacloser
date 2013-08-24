document.addEventListener('DOMComponentsLoaded', function(){
    var app = new Instacloser();
});


function Instacloser () {
	var self = this;
	this.flipBox = document.getElementById('flipbox');
    this.accessToken = '';
    this.lat = null;
    this.lng = null;

	$('.reload').on('click', function(ev){
		ev.preventDefault();
		self.go();
	});

    this.init();
};
Instacloser.prototype.init = function () {
	this.getAccessToken();
	this.getLocalization();

	if (this.isLoggedIn()){
		$('.facebookG').removeClass('hidden');
		this.asyncPics();
	} else {
		$('.main-box').addClass('login-box');
		$('.facebookG').addClass('hidden');
	}
}
Instacloser.prototype.getAccessToken = function() {
	var hash = getHash();
	if ('' != hash) {
	    hash = hash.split('=');
	    if (2 === hash.length) {
	        this.accessToken = hash[1];
	        console.log('hash: ' + this.accessToken);
	    }
	}
	else{
	    console.warn('there is no logged in user');
	}
}
Instacloser.prototype.isLoggedIn = function() {
	return '' != this.accessToken;
}
Instacloser.prototype.getLocalization = function() {
	// this.lat = -30.060472;
	// this.lng = -51.175533;

	geolocation($.proxy(this.asyncPics, this));
}

Instacloser.prototype.asyncPics = function(coordenates) {
	var self = this;
	this.lat = coordenates.lat;
	this.lng = coordenates.lng;
	accessToken = this.accessToken;
	$.ajax({
	    url : 'https://api.instagram.com/v1/media/search?lat='+this.lat+'&lng='+this.lng+'&access_token='+accessToken+'',
	    dataType : 'jsonp',
	    success : $.proxy(self.drawPics, self),
	    error : function (error) {
	        console.log(error, 'Oh no, Ben Affleck is Batman');
	    }
	});
};
Instacloser.prototype.drawPics = function(res) {
	var img, item;
	var self = this;
	$.each(res.data, function (i, picture) {
		item = $('<li>').addClass('pictures-list-item');
		img = $('<img>').attr('src', picture.images.standard_resolution.url);

		// calculating distance
		d = self.calcDistance(picture.location.latitude, picture.location.longitude, 'K');
		if(d<1){
			dtext = Math.round( d*1000 ) + 'm';
		}
		else{
			dtext = d.toFixed(2) + 'Km';
		}

		distance = $('<div class="local">@' + picture.user.username + ' is ' + dtext + ' away</div>');

		distance.appendTo(item);
		img.appendTo(item);

		$('.pictures-list ul').append(item);
		console.log(picture);
	});
	this.flipBox.toggle();
};
Instacloser.prototype.calcDistance = function(lat, lng, unit) {

	var radlat1 = Math.PI * this.lat/180
	var radlat2 = Math.PI * lat/180
	var radlon1 = Math.PI * this.lng/180
	var radlon2 = Math.PI * lng/180

	// theta = (lgn where we are - lng where the picture is)
	var theta = this.lng-lng;
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180/Math.PI
	dist = dist * 60 * 1.1515
	if (unit=="K") { dist = dist * 1.609344 }
	if (unit=="N") { dist = dist * 0.8684 }
	return dist

}


function getHash() {
	var hash = window.location.hash;
	return hash.substring(1); // remove #
}

function getLinkTarget(link) {
	return link.href.substring(link.href.indexOf('#')+1);
}