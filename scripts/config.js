let main_interval
;

function parseCusomStyle(val) {
    let raw = val
        ,product = []
        ,section = []
        ,selection = ''
        ,next_p = -1
        ,skip = false
        ,safe = false
		,debugChar = 0
    ;
    for (let i = 0; i < raw.length; i++) {
        if (next_p !== -1) { next_p = 0; }
        switch(raw[i]) {
            case ':':
                if (!safe) {
                    section[1] = selection==='$'?selection:Number(selection);
                    selection = '';
                    skip = true;
                }
                break;
            case ';':
                if (!safe) {
                    section[2] = selection;
                    selection = '';
					if (((section[0] !== '<' && section[0] !== '>' && section[0] !== '<=' && section[0] !== '>=') || parseInt(section[1]) === NaN) && section[1] !== '$') {
						return '@Parsing failed! Error at chars '+debugChar+' - '+(i+1);
					}
					debugChar = i+1;
                    product.push(section);
                    section = [];
                    skip = true;
                } break;
            case '[':
                safe = true;
                selection = '&';
                skip = true;
                break;
            case ']':
                safe = false;
                skip = true;
                break;
            case '>':
            case '<':
            case '=':
                next_p = 1;
                break;
        }
        if (skip) { skip = false; continue; }
        if (next_p === 0) {
            section[0] = selection;
            selection = '';
            next_p = -1;
        }
        selection += raw[i];
    }	
    return product;
}

$(function(){
	let eStyles = document.getElementById('enableStyles')
	,aRatings = document.getElementById('disableAuto')
	,colorContent = $('textarea#colorContent')
	;
	chrome.storage.local.get(function(storage) {
		
		console.log(typeof storage.main_interval === 'number');
		main_interval = storage.main_interval!==undefined&&typeof storage.main_interval==="number"?storage.main_interval:function(){
			console.log('check\'d');
			chrome.storage.local.set({main_interval: 500});
			return 500;
		};
		
		if (storage.default_styling === false) {
			eStyles.checked = true;
			colorContent.removeAttr('disabled');
		}
		
		if (storage.auto_ratings === false) {
			aRatings.checked = true;
		}
		
		
		colorContent.val(storage.styling_raw!==undefined?storage.styling_raw:'>=0:darkred;>60:red;>80:yellow;>90:lightgreen;>95:green;>=99:[border: yellow 1px solid;];$:lightblue;');
		
		
		console.error(storage);
		
		$('input#intervalInputConfig').val(main_interval);
		
		eStyles.addEventListener('input', function(e){
			console.log('Event call fired');
			console.error(eStyles.checked);
			console.error(typeof colorContent.attr('disabled') !== typeof undefined);
			console.error(colorContent.attr !== false);
			console.warn(typeof colorContent);
			console.log(typeof undefined);
			if (eStyles.checked && (typeof colorContent.attr('disabled') !== typeof undefined || colorContent.attr !== false)) {
				console.log('a');
				colorContent.removeAttr('disabled');
			} else if (!eStyles.checked && (typeof colorContent.attr('disabled') === typeof undefined || colorContent.attr === false)){
				console.log('b');
				colorContent.prop('disabled', true);
			} else {
				//console.warn('c');
			}
		});
		
		$('button#submitChanges').click(function(){
			chrome.storage.local.set({main_interval: parseInt($('input#intervalInputConfig').val())});
			chrome.storage.local.set({default_styling: !eStyles.checked});
			chrome.storage.local.set({auto_ratings: !aRatings.checked});
			
			let compiled = parseCusomStyle(colorContent.val());
			if (compiled[0] === '@') {
				$('#parseErrors').attr('style', 'color:red;').html(compiled.substring(1));
			} else {
				chrome.storage.local.set({styling_raw: colorContent.val()});
				chrome.storage.local.set({styling: compiled});
				$('#parseErrors').attr('style', 'color:lightgreen;').html('Parse successful');
			}
		});
		$('#reset').click(function(){
			$('input#intervalInputConfig').val(500);
			eStyles.checked = false;
			if (typeof colorContent.attr('disabled') === typeof undefined || colorContent.attr === false){
				colorContent.prop('disabled', true);
			}
			aRatings.checked = false;
			colorContent.val('>=0:darkred;>60:red;>80:yellow;>90:lightgreen;>95:green;>=99:[border: yellow 1px solid;];$:lightblue;');
		});
	});
});





















