/**
 * Logic for dynamically manipulating the DOM.
 *
 * @author Ajit Apte
 */

// ------------------- Global variables ---------------------------------
// Map related variables
var currentInfoWindow;
var eventMarkerMap = {};
var geocoder;
var homeMarker;
var map;
var markers = []; 

// Event related variables and methods
var allEvents = [];          // All events sorted by start date
var selectedCategories =     // Bit vector for selected categories. 0th position is reserved for 'any'.
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false];
var selectedTimes = {'today': false, 'tomorrow': false, 'weekend': false, 'any': false};	
var filters = [categoryFilter, timeFilter];  // List of filter methods.

/** Mapping from event category to the image. */
var imageMap = {
	1: 'music.png',
	2: 'arts.png',
	3: 'media.png',
	4: 'social.png',
	5: 'education.png',
	6: 'commercial.png',
	7: 'festivals.png',
	8: 'sports.png',
	10: 'other.png',
	11: 'comedy.png',
	12: 'politics.png',
	13: 'family.png',
};

/** Category filter. */
function categoryFilter(events) {
	// No category criteria - return all events
	if (selectedCategories[0] == true) {
		return events;
	}

	// Gather all categories to filter by
	var categories = [];
	for (var i in selectedCategories) {
		if (selectedCategories[i] == true) {
			categories.push(eval(i));
		}
	}
	
	// Remove events that are not in the selected categories
	return events.filter(byCategory);

	/** Filter by category. */
	function byCategory(event) {
		for (var i in categories) {
			if (event.category_id == categories[eval(i)]) {
				return true;
			}
		}
		return false;
	}
}	

/** Time filter. */
function timeFilter(events) {
	// No time criteria - return all events
	if (selectedTimes['any'] == true) {
		return events;
	}

	// Gather all times to filter by
	var times = [];
	for (var key in selectedTimes) {
		if (selectedTimes[key] == true) {
			times.push(key);
		}
	}

	return events.filter(byTime);
	
	/** Filter by time. */
	function byTime(event) {
		var startDate = new Date(event.start_date);
		var endDate = event.end_date.indexOf('-') >= 0 ? 
			new Date(event.end_date) : startDate;
		var today = new Date();
		var tomorrow = new Date(today.getTime() + 86400 * 1000);
		
		// new Date() gives today's date according to the local time zone
		// while new Date(string) interpretes the string to be in the UTC time zone.
		// Thus, use the UTC date for the event start and end dates, and use the local
		// date for today.
		var eventTimes = [];
		if (startDate.getUTCDate() <= today.getDate() && 
		    today.getDate() <= endDate.getUTCDate()) {
			eventTimes.push('today');
		}
		if (startDate.getUTCDate() <= tomorrow.getDate() && 
			tomorrow.getDate() <= endDate.getUTCDate()) {
			eventTimes.push('tomorrow');
		}
		if (endDate.getUTCDay() - startDate.getUTCDay() < 0) {
			eventTimes.push('weekend');
		}

		for (var i in times) {
			for (var j in eventTimes) {
				if (times[eval(i)] == eventTimes[eval(j)]) {
					return true;
				}
			}
		}
		return false;
	}
}
	
/** Applies all filters on all events and returns the filtered event list. */
function filterEvents() {
	var events = allEvents.filter(function(x) {return true});  // Make a local copy!
	var filteredEvents = [];
	for (var i in filters) {
		filteredEvents = filters[i](events);
		events = filteredEvents;
	}
	return events;
}


// -------------------- Initialization logic -----------------------------

/** Bootstrap. */
function initialize() {
	initMap();
	geocoder = new GClientGeocoder();
	var flag = readCookie('search');
	if (flag != 'true' || flag == null) {
		whereAmI();
	} else {
		markHome();
		insertYahooUpcomingScript();
	}
}
 
/** Finds out the user's geolocation and stores it as a cookie. */
function whereAmI() {
	// Try W3C geolocation (preferred)
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			storeMyLocation(position.coords.latitude, position.coords.longitude);
			markHome();
			insertYahooUpcomingScript();
		}, function() {
			alert("W3C geolocation service failed. You have been placed in Mountain View, CA.");
			storeMyLocation(37.386, -122.082);
			markHome();
			insertYahooUpcomingScript();
		});
	
	// Try Google Gears geolocation
	// Note that using Google Gears requires loading the Javascript
	// at http://code.google.com/apis/gears/gears_init.js
	} else if (google.gears) {
		var geo = google.gears.factory.create('beta.geolocation');
		geo.getCurrentPosition(function(position) {
			storeMyLocation(position.coords.latitude, position.coords.longitude);
			markHome();
			insertYahooUpcomingScript();
		}, function() {
			alert("Google Gears geolocation service failed. You have been placed in Mountain View, CA.");
			storeMyLocation(37.386, -122.082);
			markHome();
			insertYahooUpcomingScript();
		});
	
	// Browser doesn't support geolocation
	} else {
		alert("Your browser doesn't support geolocation. You have been placed in Mountain View, CA.");
		storeMyLocation(37.386, -122.082);
		markHome();
		insertYahooUpcomingScript();
	}
}

/** Initializes the map. */
function initMap() {
	var options = {
		zoom: 10,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map_canvas"), options);
}

/** Marks home on the map. */
function markHome() {
	// Clear old home marker
	if (homeMarker) {
		homeMarker.setMap(null);
	}
	
	_home = new google.maps.LatLng(readCookie('latitude'), readCookie('longitude'));
	map.setCenter(_home);

	var image = new google.maps.MarkerImage('images/home.png',
		  new google.maps.Size(48, 48),
		  new google.maps.Point(0, 0),     // origin
		  new google.maps.Point(0, 32));   // anchor
	homeMarker = new google.maps.Marker({
		position: _home, 
		map: map, 
		title: "Home sweet home!",
		icon: image
	});
}

/** Insert a script element for invoking the Yahoo! Upcoming script. */
function insertYahooUpcomingScript() {
	var _location = readCookie('latitude') + ',' + readCookie('longitude');

	var eventsScript = document.createElement('script');
	eventsScript.src = 'http://upcoming.yahooapis.com/services/rest/?api_key=ea79f3c7b2' + 
		'&method=event.getBestInPlace&sort=score-desc&per_page=25&format=json' + 
		'&callback=handleResponse&location=' + _location;

	document.getElementsByTagName('head')[0].appendChild(eventsScript);
}

/** Callback to handle event feed results. */
function handleResponse(response) {
	if (response.rsp.stat != 'ok') {
		alert('Error fetching events feed. Please try after some time.');
		return;
	}
	
	// Sort events by start date and store in global list
	allEvents = response.rsp.event;
	allEvents.sort(function(event1, event2) {
		var startDate1 = new Date(event1.start_date);
		var startDate2 = new Date(event2.start_date);
		return startDate1.getTime() - startDate2.getTime();
	});

	// Default settings
	var anyEventsBox = document.getElementById('events_any');
	anyEventsBox.checked = true;
	uncheckAll(anyEventsBox, 'events');
	updateCategories(anyEventsBox, 0, false);

	var anyTimesBox = document.getElementById('times_any');
	anyTimesBox.checked = true;
	uncheckAll(anyTimesBox, 'times');
	updateTimes(anyTimesBox, 'any', false);
	
	updateAllWidgets();
}

/** Updates selected event categories. */
function updateCategories(checkBox, categoryId, updateWidgets) {
	selectedCategories[categoryId] = checkBox.checked;
	
	// If no category criteria unselect all categories, otherwise unselect 'any'.
	if (categoryId == 0) {
		for (var i = 1; i < selectedCategories.length; i++) {
			selectedCategories[i] = false;
		}
	} else {
		selectedCategories[0] = false;
		var anyBox = document.getElementById('events_any');
		anyBox.checked = false;
		anyBox.disabled = '';
	}

	updateWidgets = updateWidgets === undefined || false;  // default
	if (updateWidgets == true) {
		updateAllWidgets();
	}
}

/** Updates selected times. */
function updateTimes(checkBox, timeTag, updateWidgets) {
	selectedTimes[timeTag] = checkBox.checked;

	if (timeTag == 'any') {
		for (var t in selectedTimes) {
			if (t != 'any') {
				selectedTimes[t] = false;
			}
		}
	} else {
		selectedTimes['any'] = false;
		var anyBox = document.getElementById('times_any');
		anyBox.checked = false;
		anyBox.disabled = '';
	}

	updateWidgets = updateWidgets === undefined || false;  // default
	if (updateWidgets == true) {
		updateAllWidgets();
	}
}

/** Updates all user-visible widgets  */
function updateAllWidgets() {
	var events = filterEvents();
	updateMarkers(events);
	updateScroller(events);
}

/** Update markers according to the given events. */
function updateMarkers(events) {
	// Clear all markers.
	for (var i in markers) {
		markers[i].setMap(null);
	}
	markers = [];

	// Add markers for the given events
	eventMarkerMap = {};
	for (var i in events) {
		var event = events[i];
		var _location = new google.maps.LatLng(event.latitude, event.longitude);
		var _name = event.name;
		var image = new google.maps.MarkerImage('images/' + imageMap[event.category_id],
			new google.maps.Size(32, 32),
			new google.maps.Point(0, 0),     // origin
			new google.maps.Point(0, 32));   // anchor		
		var letter = String.fromCharCode("A".charCodeAt(0) + eval(i));
		var marker = new google.maps.Marker({
			position: _location, 
			map: map, 
			title: _name,
			icon: 'http://www.google.com/mapfiles/marker' + letter + '.png',
		});
		markers.push(marker);
		attachInfo(marker, event);
	}
	
	/** Creates an InfoWindow for the given marker and event information. */
	function attachInfo(marker, event) {
		var info = new google.maps.InfoWindow(
			{
				content: formatInfo(event),
				size: new google.maps.Size(75, 50)
			});
		google.maps.event.addListener(marker, 'click', function() {
			if (currentInfoWindow) {
				currentInfoWindow.close();
			}
			info.open(map, marker);
			currentInfoWindow = info;
		});
		eventMarkerMap[event.id] = {'info': info, 'marker': marker};
	}
	
	/** Formats information about the given event into human readable form. */
	function formatInfo(event) {
		var content = '<div id="event_info" style="background-color: #F5E1BF; padding: 5px;">'
		
		// Name
		if (event.url == '') {
			content += '<h3>' + event.name + '</h3>';
		} else {
			content += '<a href="' + event.url + '" target="_blank">' + event.name + '</a>';
			content += '<br>';
		}
		
		// Description
		content += event.description + '</b><p></p>';
		
		// Address
		content += '<b>Venue:&nbsp;</b>' + event.venue_name + ', ' + event.venue_address + ', ' + 
			event.venue_city + ' ' + event.venue_state_code + ' ' + event.venue_zip + '<br>';

		// Dates
		content += '<b>Date:&nbsp;</b>' + event.start_date;
		if (event.end_date.indexOf('-') >= 0) {
			content += ' to ' + event.end_date;
		}
		content += '<br>';

		// Time
		if (event.start_time.indexOf(':') >= 0) {
			content += '<b>Time:&nbsp;</b>' + event.start_time;
			if (event.end_time != -1) {
				content += ' to ' + event.end_time;
			}
			content += '<br>';
		}

		// Price
		content += '<b>Ticket Price:&nbsp;</b>'
		if (event.ticket_free == 1) {
			content += 'free';
		} else {
			if (event.ticket_price == '') {
				content += 'Not Available';
			} else {
				content += event.ticket_price;
			}
		}
		
		// Ticket URL
		if (event.ticket_url != '') {
			content += '<br>';
			content += '<b>Ticket URL:&nbsp;</b>';
			content += '<a href="' + event.ticket_url + '" target="_blank">' + event.ticket_url + '</a>';
		}
				
		content += '</div>';
		return content;
	}
}

/** Updates the scroller with the given events. */
function updateScroller(events) {
	var scroller = document.getElementById('events_scroller');
	
	// Remove all rows
	for (var i = scroller.rows.length - 1; i >= 0; i--) {
		scroller.deleteRow(i);
	}
	
	// Add events to scroller
	for (var i in events) {
		var event = events[i];
		var row = document.createElement('tr');
		scroller.appendChild(row);
		
		// Table in each row
		var innerTable = document.createElement('table');
		row.appendChild(innerTable);
		innerTable.setAttribute('id', event.id);
		innerTable.setAttribute('style', 'width: 100%');
		innerTable.setAttribute('onclick', "openInfo(" + event.id + ")");
		innerTable.setAttribute('onmouseover', "this.style.backgroundColor = '#F7EEEE'");
		innerTable.setAttribute('onmouseout', "this.style.backgroundColor = 'white'");
		innerTable.setAttribute('cellpadding', '1px');
		
		// First row in the inner table contains marker and the link to the event
		var row1 = document.createElement('tr');
		innerTable.appendChild(row1);

		var cell1 = document.createElement('td');
		cell1.setAttribute('rowspan', '2');
		cell1.setAttribute('style', 'background-color: #F5E1BF;');
		row1.appendChild(cell1);
		var markerImage = document.createElement('img');
		cell1.appendChild(markerImage);
		var letter = String.fromCharCode("A".charCodeAt(0) + eval(i));
		markerImage.setAttribute('src', 'http://www.google.com/mapfiles/marker' + letter + '.png');

		var cell2 = document.createElement('td');
		cell2.setAttribute('colspan', '2');
		row1.appendChild(cell2);
		if (event.url == '') {
			cell2.innerHTML = '<h3>' + event.name + '</h3>';
		} else {
			var linkToEvent = document.createElement('a');
			cell2.appendChild(linkToEvent);
			linkToEvent.setAttribute('href', event.url);
			linkToEvent.setAttribute('target', '_blank');
			linkToEvent.innerHTML = '<b>' + event.name + '</b>';
		}

		// Second row in the inner table contains category image and description
		var row2 = document.createElement('tr');
		innerTable.appendChild(row2);

		var cell3 = document.createElement('td');
		row2.appendChild(cell3);
		var categoryImage = document.createElement('img');
		cell3.appendChild(categoryImage);
		categoryImage.setAttribute('src', 'images/' + imageMap[event.category_id]);
		categoryImage.setAttribute('style', 'border: 1px solid blue;');

		var cell4 = document.createElement('td');
		row2.appendChild(cell4);
		cell4.innerHTML = event.venue_name;
	}
}

/** Opens the info window for a specified event. */
function openInfo(eventId) {
	if (currentInfoWindow) {
		currentInfoWindow.close();
	}
	var row = eventMarkerMap[eventId];
	row.info.open(map, row.marker);
	currentInfoWindow = row.info;
}

/** Initialize geocoder on load **/
function setGeoCoder(){	
       geocoder = new GClientGeocoder();
}

/** Stores the user's location in a cookie. */
function storeMyLocation(latitude, longitude) {
	writeCookie('latitude', latitude);
	writeCookie('longitude', longitude);
}

/**  Geocode user provided location, store cookie and reload page. **/
function showAddress(address) {
	if (geocoder) {
        geocoder.getLatLng (
          address,
          function(point) {
            if (!point) {
            	alert(address + " not found");
            } else {
				writeCookie('search', 'true');
				storeMyLocation(point.lat(), point.lng());
				markHome();
				insertYahooUpcomingScript();
            }
          }
        );
	}
}






