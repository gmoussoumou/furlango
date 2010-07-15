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

/** 
 * Toggles the display of the target widget, when the 
 * zipper widget is clicked.
 */
function toggle(target, zipper) {
	var targetWidget = document.getElementById(target);
	var zipperWidget = document.getElementById(zipper);
	if (targetWidget.style.display == 'none') {
		targetWidget.style.display = '';
		zipperWidget.src = '/images/collapse_arrow.png';
	} else {
		targetWidget.style.display = 'none';
		zipperWidget.src = '/images/expand_arrow.png';
	}
}

/** Returns if the target widget is currently open. */
function isOpen(target) {
	if (document.getElementById(target).style.display == '') {
		return true;
	}
	return false;
}

/** Remove all DOM children for the given widget. */
function removeAllChildren(widget) {
	while (widget.hasChildNodes()) {
		widget.removeChild(widget.firstChild);
	}
}	

/** Clears the hash in Window#location and resets the document's title. */
function clearLocationHash() {
	window.location.hash = '';
	document.title = 'Events around you - Furlango';
}
