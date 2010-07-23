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
		zipperWidget.src = 'images/collapse_arrow.png';
	} else {
		targetWidget.style.display = 'none';
		zipperWidget.src = 'images/expand_arrow.png';
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

/** 
 * Converts a one-digit number to a two-digit number by padding it with a zero.
 * If a number has two or more digits, returns the same number.
 */
function padWithZero(number) {
	if (eval(number) < 10) {
		return '0' + number;
	}
	return number;
}

/** 
 * Converts a date like '2010-07-22' and a time like '20:00:00' 
 * to 'Thu Jul 22 h20:00'. 
 */
function convertDate(date, time) {
	var y = eval(date.substring(0, 4));
	var m = eval(date.substring(5, 7));
	var d = eval(date.substring(8, 10));
	
	// Assume toDateString() returns a string like 'Thu Jul 08 2010'
	var str = new Date(y, m-1, d).toDateString().substring(0, 10);
	
	if (time.indexOf(':') >= 0) {
		str += ', ' + twentyFourHourToTwelveHour(time.substring(0, 5));	
	}
	return str;
}
	
/** 
 * Converts the given 24-hour time to a 12-hour time. 
 * 18:35 -> 6:35 PM
 * 06:35 -> 6:35 AM
 * 00:00 -> 12:00 AM
 * 12:14 -> 12:14 PM
 */
function twentyFourHourToTwelveHour(time) {
	var h = eval(time.substring(0, 2));
	var m = eval(time.substring(3, 5));
	var merediem = 'AM';
	if (h == 0) {
		h = 12;
	} else if (h == 12) {
		merediem = 'PM';
	} else if (h > 12) {
		h -= 12;
		merediem = 'PM';
	}
	return h + ':' + padWithZero(m) + ' ' + merediem;
}
