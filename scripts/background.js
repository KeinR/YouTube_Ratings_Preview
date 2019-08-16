const API_KEY = "AIzaSyDHpPnfZiJzPJGIFnaluk3W7ZayDqZ5Vsg";



chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [new chrome.declarativeContent.PageStateMatcher({
				pageUrl: {hostEquals: 'www.youtube.com', schemes: ['https'] },
			})],
				actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
	chrome.contextMenus.create({
		id: "RatingsYT",
		title: "Manually Get rating",
		contexts: ["link"],
	});
	chrome.contextMenus.onClicked.addListener(function(info, tab){
		//chrome.storage.local.clear()
		$.ajax({
			type: 'GET',
			async: true,
			url: 'https://www.googleapis.com/youtube/v3/videos',
			data: ({id: info.linkUrl.substring(info.linkUrl.indexOf('=')+1), key: API_KEY, part: 'statistics'}),
			success: function(response) {
				console.log(response);
				let likes = parseInt(response.items[0].statistics.likeCount);
				let dislikes = parseInt(response.items[0].statistics.dislikeCount);
				let percent = Math.round(likes/(likes+dislikes)*1000)/10;
				alert(percent+"%");
			}
		});
	});
});

chrome.extension.onConnect.addListener(function(port) {
	console.log("Connected.....");
	port.onMessage.addListener(function(msg) {
		console.log("Message recieved:\n" + msg);
		$.ajax({
			type: 'GET',
			async: true,
			url: 'https://www.googleapis.com/youtube/v3/videos',
			data: ({id: msg, key: API_KEY, part: 'statistics'}),
			success: function(response) {
				console.log("Sending->");
				console.log(response);
				port.postMessage(response);
			}
		});
	});
});


/*
chrome.storage.local.set({test: true}, function(result) {
	console.log("%c"+result, "color:blue");
});
*/

chrome.storage.local.get(function(storage){
	console.warn(storage);
});
