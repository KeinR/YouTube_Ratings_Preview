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
					if (((section[0] !== '<' && section[0] !== '>' && section[0] !== '<=' && section[0] !== '>=') || Number.isNaN(section[1])) && section[1] !== '$') {
						return '@Parsing failed! Error at chars '+debugChar+' - '+(i+1)+' (statement '+(product.length+1)+')';
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

		if (storage.default_styling === false) {
			eStyles.checked = true;
			colorContent.removeAttr('disabled');
		}

		if (storage.auto_ratings === false) {
			aRatings.checked = true;
		}


		colorContent.val(storage.styling_raw!==undefined?storage.styling_raw:'>=0:darkred;>60:red;>80:yellow;>90:lightgreen;>95:green;>=99:[border: yellow 1px solid;];$:lightblue;');


		console.error(storage);


		eStyles.addEventListener('input', function(e){
			if (eStyles.checked && (typeof colorContent.attr('disabled') !== typeof undefined || colorContent.attr !== false)) {
				colorContent.removeAttr('disabled');
			} else if (!eStyles.checked && (typeof colorContent.attr('disabled') === typeof undefined || colorContent.attr === false)){
				colorContent.prop('disabled', true);
			}
		});

		$('button#submitChanges').click(function(){
			chrome.storage.local.set({default_styling: !eStyles.checked});
			chrome.storage.local.set({auto_ratings: !aRatings.checked});

			let compiled = parseCusomStyle(colorContent.val());
			if (compiled[0] === '@') {
				$('#parseErrors').attr('style', 'color:red;').html(compiled.substring(1));
			} else {
				chrome.storage.local.set({styling_raw: colorContent.val()});
				chrome.storage.local.set({styling: compiled});
				$('#parseErrors').attr('style', 'color:green;').html('Success. Refresh the page to apply changes.');
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
