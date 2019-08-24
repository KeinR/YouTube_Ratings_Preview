let port = chrome.extension.connect({ name: Math.random()+'' })
,v1 = /views/
,v1_1 = /watching/
,v1_2 = /Recommended/
,v2 = /%/
,v3 = /&/
,v4 = /,/
,returns = {}
,backlog = []
,set = ''
,styling
,default_styling
,auto_ratings
,url_observer_config = {childList: false, characterData: false, attributes: true, subtree: false}
;
function isElementInViewport(el) { // Function courtesy of Stack Overflow

    // For jQuery
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



// YouTube loads its pages dynamically, so a listener has to be placed on all elements that are allready loaded and a special function called that will refresh their value
function dataSoloLink(subject) { // This functon serves that purpose.
	let paren = subject.parent().parent(); // Cache parent
	paren.addClass('yt_ratings_used'); // Ensure that the mutation observer doesn't iterate over it
	let insert = paren.find('div#metadata-line').find(">:first-child"); // Cache metadata section
	insert.find('.YT_ratings_data_rating').each(function(){ // Remove old rating
		$(this).remove();
	});
	if (!v2.test(insert.html())) { // Just in case, test if there's already ratings data in metadata section

		let send = (set.length>0&&(set.match(/,/g)||[]).length+1<50?',':'') + subject.attr('href').substring(9); // Determine comma

		if (set.indexOf(v4.test(send)?send.substring(1):send) === -1) { // Ensure that this isn't a duplicate
			if (v3.test(send)) {
                /* Some videos, if you've watched some of it allready, will have a &t=55s or something of the like appended to the end of a video url.
                This detects and removes that, as the YT API doesn't like those */
				send = send.substring(0, send.indexOf('&'));
			}

			if ((set.match(/,/g) || []).length + 1 >= 50) {
                /* Couting by the number of commas and therefore video IDs, determine if the number is at or over 50.
                This is important because the YouTube API won't allow single requests with more than 50 video IDs. */
				backlog.push(set);
				set = '';
			}

			if (returns[v4.test(send)?send.substring(1):send] === undefined) {
                /* Finally, check that a key for the current video ID doens't exist, ensuring that there isn't an active request for the rating in progress */
				set += send;
				returns[v4.test(send)?send.substring(1):send] = insert;
			}
		}
	}
	if (set.length > 0) { // Push what's in "set" to the backlog so that it can be processed
		backlog.push(set);
		set = '';
	}
}

function data() {
	console.log('switch');
	$('div[id=\'dismissable\']:not(.yt_ratings_used,.ytd-shelf-renderer)').each(function(){ // Iterate over all video sections that do not have values and are not dividers
		console.log('case');
		let paren = $(this); // Cache parent
		paren.addClass('yt_ratings_used'); // Ensure that the mutation observer doesn't iterate over it
		$(this).find('a#thumbnail').each(function(){ // Get thumbnail
			if ($(this).attr('href').indexOf('&start_radio=') !== -1) { // If it's a playlist, skip it
				return false;
			}

			let preParen = $(this); // Cache thumbnail

			new MutationObserver(function(mutations){ // Integral to half of the extension's function, this observes elements for url changes
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

                if (set.indexOf(v4.test(send)?send.substring(1):send) === -1) {
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
		});
	});
	if (set.length > 0) {
		backlog.push(set);
		set = '';
	}
}

function parsePass(value, percent) { // Run the parsed data for custom rating styles
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

port.onMessage.addListener(function(msg) { // Listen for messages from background.js. These messages will contain rating data.

	for (let i = 0; i < msg.items.length; i++) {
		if (v2.test(returns[msg.items[i].id].html())) { continue; } // Don't bother if rating is already present

		if (msg.items[i].statistics.likeCount !== undefined) {
			let likes = parseInt(msg.items[i].statistics.likeCount);
			let dislikes = parseInt(msg.items[i].statistics.dislikeCount);
			let percent = Math.round(likes/(likes+dislikes)*1000)/10;

			let color = 'gray';
			let extraStyle = '';
            let superStyle = '';

			if (default_styling) { // Default styling: built to be faster
				if (percent > 95) {
					color = 'green';
                    if (percent >= 99) {
    					extraStyle += 'border: yellow 1px solid';
    				}
				} else if (percent > 90) {
					color = 'lightgreen';
				} else if (percent > 80) {
					color = 'yellow';
				} else if (percent > 60) {
					color = 'red';
				} else if (percent >= 0) {
					color = 'darkred';
				}

			} else {
				for (let i = 0; i < styling.length; i++) {
					if (styling[i][1] === '$') { continue; }
                    if (styling[i][1] === '*') {
                        superStyle += styling[i][2].substring(1);
                    } else if (parsePass(styling[i], percent)) {
						if (styling[i][2][0] !== '&') {
							color = styling[i][2];
						} else {
							extraStyle = styling[i][2].substring(1);
						}
					}
				}
			}


			returns[msg.items[i].id].append('<span class="YT_ratings_data_rating"> • <span style="color: '+color+';background-color: #353535;border-radius: 2px;padding: 0 1px;'+superStyle+extraStyle+'">'+percent+'%</span></span>');
		} else {
			let color = 'lightblue'
			let extraStyle = '';
            let superStyle = '';
			if (!default_styling) {
				for (let i = 0; i < styling.length; i++) {
                    if (styling[i][1] === '*') {
                        superStyle += styling[i][2].substring(1);
                    } else if (styling[i][1] === '$') { // 0?
						if (styling[i][2][0] === '&') {
							extraStyle = styling[i][2].substring(1);
						} else {
							color = styling[i][2];
						}
					}
				}
			}
			returns[msg.items[i].id].append('<span class="YT_ratings_data_rating"> • <span style="color: '+color+';background-color: #353535;border-radius: 2px;padding: 0 1px;'+superStyle+extraStyle+'">N/A%</span></span>');
		}
		console.log('%cSetting flag', 'color:green');
		returns[msg.items[i].id].parent().parent().parent().parent().parent().parent().addClass('yt_ratings_used');
		delete returns[msg.items[i].id];
	}
});


$(function(){
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
		if (storage.auto_ratings === undefined || storage.auto_ratings === true) {
            new MutationObserver(function(mutations){
        		console.log('%cRUN', 'color:blue;');
        		data();
        	}).observe($('body')[0], {attributes: false, childList: true, subtree: true});
			setInterval(function(){
				if (backlog.length > 0) {
					console.log('Fetching:\n'+backlog[0]);
					console.log(backlog);
					port.postMessage(backlog[0]);
					backlog.shift();
				}
			}, 10);
		}
	});
});
