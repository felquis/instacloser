document.addEventListener('DOMComponentsLoaded', function(){
    var app = new Instacloser();
});


function Instacloser () {
	this.flipBox = document.getElementById('flipbox');
    this.accessToken = '';
    this.lat = null;
    this.lng = null;
    this.init();
};
Instacloser.prototype.init = function () {
	this.getAccessToken();
	this.getLocalization();

	if(this.isLoggedIn()){
		alert(0);
		this.asyncPics();
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
	this.lat = -30.060472;
	this.lng = -51.175533;
}
Instacloser.prototype.asyncPics = function() {
	var self = this;
	lat = this.lat;
	lng = this.lng;
	accessToken = this.accessToken;
	$.ajax({
	    url : 'https://api.instagram.com/v1/media/search?lat='+lat+'&lng='+lng+'&access_token='+accessToken+'',
	    dataType : 'jsonp',
	    success : $.proxy(self.drawPics, self),
	    error : function (error) {
	        console.log(error, 'Oh no, Ben Affleck is Batman');
	    }
	});
};
Instacloser.prototype.drawPics = function(res) {
	var img;
	$.each(res.data, function (i, picture) {
		img = $('<img>').attr('src', picture.images.thumbnail.url);
		$('.pictures-list').append(img);
	});
	this.flipBox.toggle();
};


function getHash() {
	var hash = window.location.hash;
	return hash.substring(1); // remove #
}

function getLinkTarget(link) {
	return link.href.substring(link.href.indexOf('#')+1);
}