let port = chrome.extension.connect({ name: Math.random()+'' })
,query = window.location.href
,v1 = /views/
,v1_1 = /watching/
,v1_2 = /Recommended/
,v2 = /%/
,v3 = /&/
,v4 = /,/
,returns = {}
,activeRequest = false
,backlog = []
,set = ''
,execution_paused = false
,styling
,default_styling
,auto_ratings
,url_observer_observed = []
,url_observer_config = {childList: false, characterData: false, attributes: true, subtree: false}
;
function isElementInViewport(el) { // Function courtesy of Stack Overflow

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    let rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}

function dataSoloLink(subject) {
	let paren = subject.parent().parent(); // Cache parent
	paren.addClass('yt_ratings_used');
	let insert = paren.find('div#metadata-line').find(">:first-child"); // Cache metadata section
	insert.find('.kein_data_rating').each(function(){
		$(this).remove();
	});
	if (!v2.test(insert.html())) { // Just in case, test if there's already ratings data in metadata section
		
		let send = (set.length>0&&(set.match(/,/g)||[]).length+1<50?',':'') + subject.attr('href').substring(9); // Determine comma
		
		if (set.substring(set.lastIndexOf(',')+1) !== (v4.test(send)?send.substring(1):send)) {
			if (v3.test(send)) {
				send = send.substring(0, send.indexOf('&'));
			}
			
			if ((set.match(/,/g) || []).length + 1 >= 50) {
				backlog.push(set);
				set = '';
			}

			if (returns[v4.test(send)?send.substring(1):send] === undefined) {
				set += send;
				returns[v4.test(send)?send.substring(1):send] = insert;
			}
		}
	}
	if (set.length > 0) {
		backlog.push(set);
		set = '';
	}
}

function data() {
	console.log('switch');
	$('div[id=\'dismissable\']:not(.yt_ratings_used,.ytd-shelf-renderer)').each(function(){ // Iterate over all video sections that do not have values and are not dividers
		console.log('case');
		let paren = $(this); // Cache parent
		paren.addClass('yt_ratings_used');
		$(this).find('a#thumbnail').each(function(){ // Get thumbnail
			if ($(this).attr('href').indexOf('&start_radio=') !== -1) { // If it's a playlist, mark it and skip
				return false;
			}
			
			let preParen = $(this); // Cache thumbnail
			
			url_observer_observed[url_observer_observed.length] = $(this);
			
			new MutationObserver(function(mutations){
				for (let i = 0; i < mutations.length; i++) {
					let target = $(mutations[i].target);
					if (target.attr('id') === 'thumbnail') {
						dataSoloLink($(mutations[i].target));
					}
				}
			}).observe(this, url_observer_config);
			
			let insert = paren.find('div#metadata-line').find(">:first-child"); // Cache metadata section
			if (!v2.test(insert.html())) { // Just in case, test if there's already ratings data in metadata section
								
				let send = (set.length>0&&(set.match(/,/g)||[]).length+1<50?',':'') + preParen.attr('href').substring(9); // Determine comma
				
				if (set.substring(set.lastIndexOf(',')+1) !== (v4.test(send)?send.substring(1):send)) {
					if (v3.test(send)) {
						send = send.substring(0, send.indexOf('&'));
					}
					
					if ((set.match(/,/g) || []).length + 1 >= 50) {
						backlog.push(set);
						set = '';
					}
					//console.warn(v4.test(send)?send.substring(1):send);
					//console.warn(returns[v4.test(send)?send.substring(1):send]);
					//console.warn(insert);
					if (returns[v4.test(send)?send.substring(1):send] === undefined) {
						set += send;
						returns[v4.test(send)?send.substring(1):send] = insert;
					}
				}
			}
		});
	});
	if (set.length > 0) {
		backlog.push(set);
		set = '';
	}
}

function parsePass(value, percent) {
	console.warn(value);
	if (value[0].indexOf('=') !== -1) {
		if (
		(value[0][0] === '>' && percent >= value[1]) || 
		(value[0][0] !== '>' && percent >= value[1])
		) { return true; }
	} else if (value[1] !== '$') {
		if (
		(value[0] === '>' && percent > value[1]) || 
		(value[0] === '<' && percent < value[1])
		) { return true; }
	}
	return false;
}

port.onMessage.addListener(function(msg) {
	//console.log(msg);
	//console.log(msg.items.length + ' --- ' + Object.keys(returns).length);
	
	//console.warn(returns);
	
	for (let i = 0; i < msg.items.length; i++) {
		if (v2.test(returns[msg.items[i].id].html())) { continue; } // CRUDE FIX; not efficient. Doesn't fix the underlying problem, it just obscures it.
		
		if (msg.items[i].statistics.likeCount !== undefined) {
			let likes = parseInt(msg.items[i].statistics.likeCount);
			let dislikes = parseInt(msg.items[i].statistics.dislikeCount);
			let percent = Math.round(likes/(likes+dislikes)*1000)/10;
			
			let color = 'gray';
			let extraStyle = '';
			
			if (default_styling) {
				console.log('%cDEF', 'color:red')
				if (percent > 95) {
					color = 'green';
				} else if (percent > 90) {
					color = 'lightgreen';
				} else if (percent > 80) {
					color = 'yellow';
				} else if (percent > 60) {
					color = 'red';
				} else if (percent >= 0) {
					color = 'darkred';
				}
				
				if (percent >= 99) {
					extraStyle += 'border: yellow 1px solid';
				}
			} else {
				console.log('%cwed', 'color:pink');
				for (let i = 0; i < styling.length; i++) {
					if (styling[i][1] === '$') { continue; }
					if (parsePass(styling[i], percent)) {
						if (styling[i][2][0] !== '&') {
							color = styling[i][2];
						} else {
							extraStyle = styling[i][2].substring(1);
						}
					}
				}
			}
			
			
			returns[msg.items[i].id].append('<span class="kein_data_rating"> • <span style="color: '+color+';background-color: #353535;border-radius: 2px;padding: 0 1px;'+extraStyle+'">'+percent+'%</span></span>');
		} else {
			let color = 'lightblue'
			let extraStyle = '';
			if (!default_styling) {
				for (let i = 0; i < styling.length; i++) {
					if (styling[i][0] === '$') {
						if (styling[i][2][0] === '&') {
							extraStyle = styling[i][2].substring(1);
						} else {
							color = styling[i][2];
						}
					}
				}
			}
			returns[msg.items[i].id].append('<span class="kein_data_rating"> • <span style="color: '+color+';background-color: #353535;border-radius: 2px;padding: 0 1px;'+extraStyle+'">N/A%</span></span>');
		}
		console.log('%cSetting flag', 'color:green');
		returns[msg.items[i].id].parent().parent().parent().parent().parent().parent().addClass('yt_ratings_used');
		delete returns[msg.items[i].id];
	}
	activeRequest = false;
});


$(function(){
	new MutationObserver(function(mutations){
		console.log('%cRUN', 'color:blue;');
		data();
	}).observe($('body')[0], {attributes: false, childList: true, subtree: true});
	
	
	
	chrome.storage.local.get(function(storage) {
				
		default_styling = storage.default_styling!==undefined?storage.default_styling:true;
		
		auto_ratings = storage.auto_ratings!==undefined?storage.default_styling:true;
		
		styling = storage.styling!==undefined?storage.styling:[
			['>=', 0, 'darkred'], 
			['>', 60, 'red'], 
			['>', 80, 'yellow'], 
			['>', 90, 'lightgreen'], 
			['>', 95, 'green'], 
			['>=', 99, '&border: yellow 1px solid;'], 
			[undefined, '$', 'lightblue']
		];
		console.log(styling);
		if (storage.autoGrabbing === undefined || storage.autoGrabbing === 'true') {
			
			setInterval(function(){
				if (query !== window.location.href) {
					query = window.location.href;
					/*
					$('span.kein_data_rating').each(function(){
						console.log('%cRemoving...', 'color:blue');
						$(this).remove();
					});
					$('.yt_ratings_used').each(function(){
						console.log('cleaning...');
						$(this).removeClass('yt_ratings_used');
					});
					backlog = [];
					returns = {};
					set = '';
					/*
					execution_paused = true;
					console.log(extension);
					console.log('Execution paused.');
					console.log("::::RESET::::\n"+query);
					$(function(){
						console.warn(returns);
						console.warn(backlog);
						console.warn(set);
						backlog = [];
						returns = {};
						set = '';
						console.error($('#fuck')[0]);
						$('span.kein_data_rating').each(function(){
							console.log('%cRemoving...', 'color:blue');
							$(this).remove();
						});
						
						$('.yt_ratings_used').each(function(){
							console.log('cleaning...');
							$(this).replaceWith('+');
						});
						
						console.log('Execution resuming...');
						data();
						execution_paused = false;
					});
					*/
				} else if (backlog.length > 0 && !activeRequest && !execution_paused) {
					console.log('Fetching:\n'+backlog[0]);
					console.log(backlog);
					port.postMessage(backlog[0]);
					backlog.shift();
				}
			}, 10);
		}
	});
});














