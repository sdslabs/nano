Array.prototype.remove = function(from, to){
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this,rest);
};

function req(path, cb){
	path = nano.settings.muzi + path;
	$.ajax({
		url: path,
		type: 'GET',
		success: function(data){
			cb(data); 
		}
	})
}

nano = {};

nano.settings = {
	muzi: 'https://sdslabs.co.in/muzi/ajax/',
	music: 'https://music.sdslabs.co.in/',
	albumPic: function(val){
		return 'https://cdn.sdslabs.co.in/music_pics/' + val + '.jpg';
	},
	shuffle: false,
	repeat: false,
	volume: 1
}

nano.data = {
	// stores all the playlists
	playlists: {},
	
	// stores selected playlist data
	playlist: {},

	// Stores like playlist for the sake of setting heart value
	likePlaylist: {},

	// stores data for current playing song
	current: {},

	// array index of song currently playing
	currentNo: -1,

	// playing == true
	// paused == false
	songState: false,

	// has current playing song been reported
	songReported: false,

	// Holds the current playing songs variable
	song: null 
}

nano.muzi = {
	// gets all playlists
	getPlaylists: function(){
		req('user/info.php?userid=me', function(data){
			if(data === "false"){
				$('.selector').html('<h1>Login to <a href="https://sdslabs.co.in/accounts/login.php?redirect=http://sdslabs.co.in/nano">SDSLabs</a></h1>')
			}
			else{
				var list = {};
				for(var i=0;i<data.playlists.length;i++){
					$('.selector ul').append('<li data-pid=' + data.playlists[i].pid + '>' + data.playlists[i].name + '</li>')
				}
				$('.selector ul li').click(function(){
					var id = $(this).attr('data-pid');
					nano.muzi.fetchPlaylist(id);
					$('.container').css('display', 'inline-block');
					$('.selector').hide()
				})

				var path = 'playlist/index.php?id='+data.likePlaylist;
				req(path, function(data){
					nano.data.likePlaylist = data;
				})

				nano.data.playlists = data;
			}
		});	
	},

	// fetches all songs from particular playlist
	fetchPlaylist: function(id){
		var path = 'playlist/index.php?id='+id;
		req(path, function(data){
			nano.data.playlist = data;
			nano.data.playlist.originalOrder = JSON.parse(JSON.stringify(nano.data.playlist.tracks));
			if(nano.settings.shuffle){
				nano.player.shuffle();
			}
			nano.muzi.playPlaylist();
		});
	},

	playPlaylist: function(){
		var next = -1;
		nano.data.currentNo++;
		if(nano.data.currentNo < nano.data.playlist.tracks.length){
			next = nano.data.currentNo;
		}
		else{
			next = 0;
			nano.data.currentNo = 0;
			if(nano.settings.shuffle){
				nano.player.shuffle();
			}
		}
		nano.player.play(nano.data.playlist.tracks[next].id, next);
	}
}

nano.player = {
	play: function(id, number){
		nano.data.songReported = false;
		path = 'track/index.php?id=' + id;

		req(path, function(data){
			if(nano.data.currentNo === number){
				
				if(typeof blinky !== "undefined"){
					clearInterval(blinky);
				}

				nano.data.current = data;
				
				var file = nano.settings.music + data.file.split('/').map(function(x){return encodeURIComponent(x);}).join('/');
				
				if(nano.data.song !== null){
					nano.data.song.unload();
				}

				nano.data.song = new Howl({
					urls: [file],
					buffer: true,
					onend: nano.muzi.playPlaylist
				}).play();

				nano.data.songState = true;
				nano.hooks.setSongDetails();
			}
		})
	},

	shuffle: function(){
		var len = nano.data.playlist.tracks.length;
		for(var i = len - 1; i > 0; i--){
			var random = Math.floor(Math.random() * i);
			var temp = nano.data.playlist.tracks[random];
			nano.data.playlist.tracks[random] = nano.data.playlist.tracks[i];
			nano.data.playlist.tracks[i] = temp;
		}
	},

	togglePlay: function(){
		if(nano.data.songState){
			nano.data.songState = false;
			nano.data.song.pause();
			$('.pause-button').html('<img src="./img/play-icon-white.png" style="margin-left: 2px;" alt="">')
		}
		else if(!nano.data.songState){
			nano.data.songState = true;
			nano.data.song.play();
			$('.pause-button').html('<img src="./img/pause-icon-white.png" alt="">')
		}
	},

	next: function(){
		nano.muzi.playPlaylist();
		
		if(typeof blinky !== "undefined"){
			clearInterval(blinky);
		}

		blinky = setInterval(function(){
			$('.next-button img').fadeOut(500, function(){
				$('.next-button img').fadeIn(500);
			})
		}, 1000);
	},

	previous: function(){
		if(nano.data.currentNo !== 0){
			if(typeof blinky !== "undefined"){
				clearInterval(blinky);
			}
			blinky = setInterval(function(){
				$('.previous-button img').fadeOut(500, function(){
					$('.previous-button img').fadeIn(500);
				})
			}, 1000);
			nano.data.currentNo = nano.data.currentNo - 2;
			nano.muzi.playPlaylist();
		}
	}
}

nano.hooks = {
	setSongDetails: function(){
		nano.hooks.setAlbumArt();
		nano.hooks.setArtist();
		nano.hooks.setTitle();
		nano.hooks.setLike();
		nano.hooks.setShare();

		$('.favorite-button').on('click', function(){
			nano.hooks.pushLike();
		});

		if(typeof reportInterval !== "undefined")
			clearInterval(reportInterval);
		reportInterval = setInterval(function(){
			nano.hooks.setDuration();	
		} , 1000);
	},

	setAlbumArt: function(){
		var id = nano.data.current.albumId;
		var path = nano.settings.albumPic(id);
		var val = 'url(' + path + ')';
		$('.poster').css('background-image', val);
	},

	setArtist: function(){
		$('.artist').html(nano.data.current.artist);
	},

	setTitle: function(){
		var title = nano.data.current.title;
		if(title.length > 28){
			$('.title').attr('title', title);
			title = title.substr(0,25);
			title = title + '...';
		}
		$('.title').html(title);
	},

	setDuration: function(){
		var dur = (nano.data.song.pos() / nano.data.current.length) * 100;
		if(dur > 100){
			dur = 100;
		}
		$('.progress div').width(dur + '%');
		
		if(nano.data.song.pos() >= 15 && !nano.data.songReported){
			nano.data.songReported = true;
			var path = 'track/log.php?id=' + nano.data.playlist.tracks[nano.data.currentNo].id;
			req(path, function(data){
				return;
			});
		}
	},

	setShare: function(){
		if(nano.data.songState){
			var muziRoot = 'https://sdslabs.co.in/muzi/';
			var trackURL = muziRoot + "#/track/" + nano.data.current.id + "/" + nano.data.current.title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
			$('.share-button a').attr('href', trackURL);
		}
	},

	pushLike: function(){
		nano.data.likePostId = nano.data.playlist.tracks[nano.data.currentNo].id;
		if($('.favorite-button').hasClass('active')){
			var type = 'remove';
			var path = nano.settings.muzi + 'playlist/remove.php';
		}
		else{	
			var type = 'add';
			var path = nano.settings.muzi + 'playlist/add.php';
		}
		$.ajax({
			url: path,
			type: 'POST',
			data: {
				id: nano.data.likePlaylist.id,
				tracks: [nano.data.likePostId]
			},
			success: function(data){
				if(data == "Playlist saved"){
					if(type === 'add'){
						nano.data.likePlaylist.tracks.push({id: nano.data.likePostId});
					}
					else if(type === 'remove'){
						var step;
						for(var i in nano.data.likePlaylist.tracks){
							if(nano.data.likePlaylist.tracks[i].id == nano.data.likePostId){
								step = i;
								break;
							}
						}
						nano.data.likePlaylist.tracks.remove(step);		
					}
					nano.hooks.setLike();
				}
			}
		})
	},

	setLike: function(){
		var currentId = nano.data.playlist.tracks[nano.data.currentNo].id;
		var set = false;
		for(var i in nano.data.likePlaylist.tracks){
			if(nano.data.likePlaylist.tracks[i].id == currentId){
				$('.favorite-button').addClass('active');
				set = true;
				break;
			}
		}
		if(!set){
			$('.favorite-button').removeClass('active');
		}
	},

	shuffleHelper: function(){
		if(!nano.settings.shuffle){
			nano.player.shuffle();
			nano.settings.shuffle = true;
			nano.config.set('shuffle', true, true);
			$('.shuffle-button').addClass('active');
		}
		else if(nano.settings.shuffle){
			nano.data.playlist.tracks = JSON.parse(JSON.stringify(nano.data.playlist.originalOrder));
			nano.settings.shuffle = false;
			nano.config.set('shuffle', false, true);
			$('.shuffle-button').removeClass('active');
		}
	},

	volumeUI: function(){
		if(typeof nano.volumeTimeout !== "undefined"){
			window.clearTimeout(nano.volumeTimeout);
		}

		$('div.flap-bottom').fadeIn();

		nano.volumeTimeout = window.setTimeout(function(){
			nano.hooks.volumeTimeOut();
		}, 2000);
	},

	volumeTimeOut: function(){
		window.setTimeout(function(){
			$('div.flap-bottom').fadeOut();
		}, 500);
	},

	playerSetup: function(){
		$('.pause-button').click(function(){
			nano.player.togglePlay();
		});
		$('.previous-button').click(function(){
			nano.player.previous();
		});
		$('.next-button').click(function(){
			nano.player.next();
		});
		$('.shuffle-button').click(function(){
			nano.hooks.shuffleHelper();
		});
		nano.hooks.setKeyboard();
	},

	setKeyboard: function(){
		$('body').on('keydown', function(e){
			var key = e.keyCode;
			switch(key){
				case 38: 
					// arrow up
					
					// hacky fix for volume jump issue 
					if(nano.settings.volume > 1){
						nano.settings.volume = 0.95;
					}
					if(nano.settings.volume <= 0.95){
						if(Howler._muted){
							Howler.unmute();
						}
						nano.settings.volume = (Number(nano.settings.volume) + 0.05).toFixed(2);
						nano.config.set('volume', nano.settings.volume, true);
						Howler.volume(nano.settings.volume);
					}
					$('div.flap-bottom .volume').width((nano.settings.volume * 100) + '%');
					nano.hooks.volumeUI();
					break;
				case 40: 
					// arrow down
					// hacky fix for volume jump issue 
					if(nano.settings.volume > 1){
						nano.settings.volume = 0.95;
					}
					if(nano.settings.volume <= 0.05){
						Howler.mute();
						nano.settings.volume = 0;
					}
					else if(nano.settings.volume >= 0.05){
						nano.settings.volume = (Number(nano.settings.volume) - 0.05).toFixed(2);
						nano.config.set('volume', nano.settings.volume, true);					
						Howler.volume(nano.settings.volume);
					}
					$('div.flap-bottom .volume').width((nano.settings.volume * 100) + '%');
					nano.hooks.volumeUI();
					break;
				case 37: 
					// arrow left
					nano.player.previous();
					break;
				case 39: 
					// arrow right
					nano.player.next();
					break;
				case 32: 
					// space
					nano.player.togglePlay();
					break;
				case 83: 
					// key = s
					nano.hooks.shuffleHelper();
					break;
				case 76: 
					// key = l
					nano.hooks.pushLike();
					break;
			}
		})
	}
}

nano.init = function(){
	nano.config = Configurator({
		shuffle: false,
		volume: 1
	},['volume', 'shuffle']);
	nano.settings.shuffle = nano.config.get('shuffle');
	nano.settings.volume = nano.config.get('volume');

	if(nano.settings.volume < 0.05){
		Howler.mute();
		nano.settings.volume = 0;
	}
	else {
		Howler.volume(nano.settings.volume);
	}

	if(nano.settings.shuffle){
		$('.shuffle-button').addClass('active');
	}

	nano.muzi.getPlaylists();
	nano.hooks.playerSetup();
}

nano.init();
