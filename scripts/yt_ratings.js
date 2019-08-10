let port = chrome.extension.connect({ name: Math.random()+'' })
,query = window.location.href
,v1 = /views/
,v1_1 = /watching/
,v1_2 = /Recommended/
,v2 = /%/
,v3 = /&/
,v4 = /,/
,returns = {}
,timeLastMovement = 0
,activeRequest = false
,backlog = []
,main
,main_interval = 500
,set = ''
,execution_paused = false;
;
function isElementInViewport(el) { // Function courtesy of Stack Overflow

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}
function data() {
	console.log('switch');
	$('div[id=\'dismissable\']:not(.yt_ratings_used,.ytd-shelf-renderer)').each(function(){ // Iterate over all video sections that do not have values and are not dividers
		console.log('case');
		let paren = $(this); // Cache parent
		$(this).find('a#thumbnail').each(function(){ // Get thumbnail
			if ($(this).attr('href').indexOf('&start_radio=') !== -1) { // If it's a playlist, mark it and skip
				paren.addClass('yt_ratings_used');
				return false;
			}
			let preParen = $(this); // Cache thumbnail
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
					set += send;
											
					returns[v4.test(send)?send.substring(1):send] = insert;
				}
			}
		});
	});
	if (set.length > 0) {
		backlog.push(set);
		set = '';
	}
}

function runData(){
	if (++timeLastMovement < 5) {
				
		data();
		
	} else if (activeRequest) {
		console.log('Request blocked; pending...');
	} else {
		console.log('idle...');
	}
}


function resetIdleTimer() { timeLastMovement = 0; }


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
			
			let color = 'pink';
			if (percent > 95) {
				color = 'green';
			} else if (percent > 90) {
				color = 'lightgreen';
			} else if (percent > 80) {
				color = 'yellow';
			} else if (percent >= 60) {
				color = 'red';
			} else if (percent < 60) {
				color = 'darkred';
			}
			
			let extraStyle = '';
			if (percent >= 99) {
				extraStyle += 'border: yellow 1px solid';
			}
			
			returns[msg.items[i].id].append('<span class="kein_data_rating"> • <span style="color: '+color+';background-color: #353535;border-radius: 2px;padding: 0 1px;'+extraStyle+'">'+percent+'%</span></span>');
		} else {
			returns[msg.items[i].id].append('<span class="kein_data_rating"> • <span style="color: lightblue;background-color: #353535;border-radius: 2px;padding: 0 1px;">N/A%</span></span>');
		}
		console.log('%cSetting flag', 'color:green');
		returns[msg.items[i].id].parent().parent().parent().parent().parent().parent().addClass('yt_ratings_used');
		//console.warn(returns[msg.items[i].id]);
		//console.warn(msg.items[i].id);
	}
	activeRequest = false;
});

window.onmousemove = resetIdleTimer;
window.onscroll = resetIdleTimer;

$(function(){
	chrome.storage.local.get(function(storage) {
		if (storage.main_interval !== undefined) {
			main_interval = parseInt(storage.main_interval);
		}
		if (storage.autoGrabbing === undefined || storage.autoGrabbing === 'true') {
			console.log(main_interval);

			main = setInterval(runData, main_interval);

			setInterval(function(){
				if (query !== window.location.href) {
					execution_paused = true;
					backlog = [];
					returns = {};
					set = '';
					clearInterval(main);
					console.log('Execution paused.');
					query = window.location.href;
					console.log("::::RESET::::\n"+query);
					$(function(){
						console.warn(returns);
						console.warn(backlog);
						console.warn(set);
						$('span.kein_data_rating').each(function(){
							console.log('%cRemoving...', 'color:blue');
							$(this).remove();
						});
						$('.yt_ratings_used').each(function(){
							console.log('cleaning...');
							$(this).removeClass('yt_ratings_used');
						});
						console.log('Execution resuming...');
						main = setInterval(runData, main_interval);
						execution_paused = false;
					});
				} else if (backlog.length > 0 && !activeRequest && !execution_paused) {
					console.log('Fetching:\n'+backlog[0]);
					console.log(backlog);
					port.postMessage(backlog[0]);
					backlog.shift();
				}
			}, 100);
		}
	});
});














