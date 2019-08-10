console.log('Present!');

let main_interval = 2000;



/*
setInterval(function(){
	chrome.storage.local.get(function(storage) {
		if (storage.main_interval !== undefined) {
			main_interval = parseInt(storage.main_interval);
		}
	});
}, 1000);
*/

$(function(){
	chrome.storage.local.get(function(storage) {
		if (storage.main_interval !== undefined) {
			main_interval = parseInt(storage.main_interval);
		}
		$('#intervalInputConfig').val(main_interval);

		$('#submitChanges').click(function(){
			chrome.storage.local.set({main_interval: $('#intervalInputConfig').val()}, function(result) {
				console.log("%c"+result, "color:blue");
			});
			chrome.storage.local.set({main_interval: $('#disableAuto').is(":checked")}, function(result) {
				console.log("%c"+result, "color:blue");
			});
		});
	});
});



