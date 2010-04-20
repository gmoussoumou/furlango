/**
 * Assorted utility methods.
 *
 * @author Ajit Apte
 */

 /** Reads the cookie with the given name. */
function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) 
			return c.substring(nameEQ.length,c.length);
	}
	return null;			
}

/** Stores the user's location in a cookie. */
function writeCookie(key, value) {
	document.cookie = key + '=' + value + '; path=/';
}

/** Shows or hides the given widget and updates the given expander icon. */
function toggle(widgetId, expanderId) {
	var widget = document.getElementById(widgetId);
	var expander = document.getElementById(expanderId);
	if (widget.style.display == '') {
		widget.style.display = 'none';
		expander.src = 'images/expand.png';
	} else {
		widget.style.display = '';
		expander.src = 'images/collapse.png';
	}
}

/** Unchecks all checkboxes with the given common name. */
function uncheckAll(allBox, name) {
	allBox.disabled = 'disabled';
	var boxes = document.getElementsByName(name);
	for (var i in boxes) {
		boxes[i].checked = !allBox.checked;
	}
}

