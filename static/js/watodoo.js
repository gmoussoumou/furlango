/**
 * All the meaty UI logic.
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
var labels = []; // All currently displayed labels
var markers = []; // All currently displayed markers

// Event related variables and methods
var allEvents = [];          // All events sorted by start date
var selectedCategories =     // Bit vector for selected categories. 0th position is reserved for 'any'.
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false];
var selectedTimes = {'today': false, 'tomorrow': false, 'weekend': false, 'any': false};	
var filters = [categoryFilter, timeFilter];  // List of filter methods.
var parameterMap = {'eventId': openInfo};  // Mapping from URL parameters to the corresponding action

var daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
	13: 'family.png'
};

/* Category ids to names. */
var categoryMap = {
	0: 'All Categories',
	1: 'Music',
	2: 'Arts',
	3: 'Media',
	4: 'Social',
	5: 'Education',
	6: 'Commercial',
	7: 'Festivals',
	8: 'Sports',
	10: 'Other',
	11: 'Comedy',
	12: 'Politics',
	13: 'Family'
};

/* Time options */
var timeMap = {
	'any': 'All Times',
	'today': 'Today',
	'tomorrow': 'Tomorrow',
	'weekend': 'Weekend'
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
		// 0 = Sunday, 6 = Saturday
		if (startDate.getUTCDay() == 0 || 
			startDate.getUTCDay() == 6 ||
			endDate.getUTCDay() == 0 || 
			endDate.getUTCDay() == 6 || 
			endDate.getUTCDay() - startDate.getUTCDay() < 0) {
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
	var events = [];
	events = allEvents.filter(function(x) {return true});  // Make a local copy!
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
	var isSearch = readCookie('search');
	if (isSearch != 'true' || isSearch == null) {
		whereAmI();
	} else {
		initChores();
	}
}

/** Initialization related chores. */
function initChores() {
	checkBrowser();
	insertYahooUpcomingScript();
	insertGrouponDealsScript();
	markHome();
	initEventCategoryOptions();
	initEventTimeOptions();
}

function checkBrowser(){
	var browserName = navigator.appName;
	if(browserName != null){
		if (browserName == "Microsoft Internet Explorer"){
			alert("We officially crash on Internet Explorer. Can you please try Firefox or Chrome instead? ");
		}	
	}
	
}
 
/** Finds out the user's geolocation and stores it as a cookie. */
function whereAmI() {
	// Try W3C geolocation (preferred)
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			storeMyLocation(position.coords.latitude, position.coords.longitude);
			initChores();
		}, function() {
			alert("W3C geolocation service failed. You have been placed in Mountain View, CA.");
			storeMyLocation(37.386, -122.082);
			initChores();
		});
	
	// Try Google Gears geolocation
	// Note that using Google Gears requires loading the Javascript
	// at http://code.google.com/apis/gears/gears_init.js
	} else if (google.gears) {
		var geo = google.gears.factory.create('beta.geolocation');
		geo.getCurrentPosition(function(position) {
			storeMyLocation(position.coords.latitude, position.coords.longitude);
			initChores();
		}, function() {
			alert("Google Gears geolocation service failed. You have been placed in Mountain View, CA.");
			storeMyLocation(37.386, -122.082);
			initChores();
		});
	
	// Browser doesn't support geolocation
	} else {
		alert("Your browser doesn't support geolocation. You have been placed in Mountain View, CA.");
		storeMyLocation(37.386, -122.082);
		initChores();
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
		'&method=event.getBestInPlace&sort=score-desc&per_page=100&format=json' + 
		'&callback=handleYahooResponse&location=' + _location;

	document.getElementsByTagName('head')[0].appendChild(eventsScript);
}

/** Insert a script element for invoking the Groupon deals script. */
function insertGrouponDealsScript() {
	var lat = readCookie('latitude');
	var lng = readCookie('longitude');

	var grouponScript = document.createElement('script');
	grouponScript.src = 'http://www.groupon.com/api/v1/deals'
		+ '?X-GrouponToken=827581b3617e5ac54482be2dcc23a12c5a36c2fd'
		+ '&lat=' + lat
		+ '&lng=' + lng
		+ '&format=json'
		+ '&callback=handleGrouponResponse';

	document.getElementsByTagName('head')[0].appendChild(grouponScript);
}

/** Initialize the event category options dialog. */
function initEventCategoryOptions() {
	// Set default
	document.getElementById('selected_category').innerHTML = categoryMap[0];
	
	var container = document.getElementById('events_categories');
	while (container.hasChildNodes()) { // start with a clean slate
		container.removeChild(container.firstChild);
	}
	var table = document.createElement('table');
	container.appendChild(table);

	// Add all categories to the dialog	
	for (var i in categoryMap) {
		var row = document.createElement('tr');
		table.appendChild(row);
		var col = document.createElement('td');
		row.appendChild(col);
		col.setAttribute("onmouseover", "this.style.backgroundColor = '#F3F8FB';");
		//col.setAttribute("onmouseout", "this.style.backgroundColor = white;");
		col.setAttribute("onclick", 
		                 "handleCategoryFilterClick(" + i + ", '" + categoryMap[i] + "');");
		col.innerHTML = categoryMap[i];            
	}
}

/** Initialize the event times options dialog. */
function initEventTimeOptions() {
	// Set default
	document.getElementById('selected_time').innerHTML = timeMap['any'];
	
	var container = document.getElementById('time_options');
	if (container.hasChildNodes()) { // Avoid double painting
		container.removeChild(container.firstChild);
	}
	var table = document.createElement('table');
	container.appendChild(table);

	// Add all time options to the dialog	
	for (var i in timeMap) {
		var row = document.createElement('tr');
		table.appendChild(row);
		var col = document.createElement('td');
		row.appendChild(col);
		col.setAttribute("onmouseover", "this.style.backgroundColor = '#F3F8FB';");
		col.setAttribute("onmouseout", "this.style.backgroundColor = white;");
		col.setAttribute("onclick", 
		                 "handleTimeFilterClick('" + i + "', '" + timeMap[i] + "');");
		col.innerHTML = timeMap[i];            
	}
}


/** Parses URL parameters and calls respective handlers. */
function processUrlParameters() {
	var params = window.location.hash.substring(1).split('&');
	for (i in params) {
		var pair = params[i].split('=');
		var handler = parameterMap[pair[0]];
		if (handler) {
			handler(pair[1]);
		}
	}
}

/** Callback to handle event feed results. */
function handleYahooResponse(response) {
	if (response.rsp.stat != 'ok') {
		alert('Error fetching events feed. Please try after some time.');
		return;
	}
	
	// Sort events by start date and store in global list
	allEvents = response.rsp.event;
	allEvents.sort(function(event1, event2) {
		if (event1.start_date == null) {
			return -1;
		} else if (event2.start_date == null) {
			return 1;
		} else {
			var startDate1 = new Date(event1.start_date);
			var startDate2 = new Date(event2.start_date);
			var result =  startDate1.getTime() - startDate2.getTime();
			if (result < 0) {
				return -1;
			} else if (result > 0) {
				return 1;
			} else {
				return 0;	
			}
		}
	});

	// Default settings
	updateCategories(0, false);
	updateTimes('any', false);
	updateAllWidgets();
	processUrlParameters();
}

/** Display all groupon deals. */
function handleGrouponResponse(response) {
	if (response.status.message != 'Ok') {
		alert('Error fetching deals. Please try after some time.');
		return;
	}
	
	var container = document.getElementById('groupon_deals');
	while (container.hasChildNodes()) { // start with a clean slate
		container.removeChild(container.firstChild);
	}
	for (var i in response.deals) {
		var deal = response.deals[i];
		
		var link = document.createElement('a');
		container.appendChild(link);
		link.setAttribute('href', deal.deal_url);
		link.setAttribute('target', '_blank');
		link.innerHTML = deal.title + '<br>';
		
		var image = document.createElement('img');
		container.appendChild(image);
		image.setAttribute('src', deal.medium_image_url);
		
		container.innerHTML += '<br><br>';
	}
}

/** Updates selected event categories. */
function updateCategories(categoryId, updateWidgets) {
	for (var i in selectedCategories) {
		selectedCategories[i] = false;
	}
	selectedCategories[categoryId] = true;

	updateWidgets = updateWidgets === undefined || false;  // default
	if (updateWidgets == true) {
		updateAllWidgets();
	}
}

/** Updates selected times. */
function updateTimes(timeTag, updateWidgets) {
	for (var t in selectedTimes) {
		selectedTimes[t] = false;
	}
	selectedTimes[timeTag] = true;

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
	// Clear all labels and markers.
	for (var i in labels) {
		labels[i].setMap(null);
	}
	labels = [];
	for (var i in markers) {
		markers[i].setMap(null);
	}
	markers = [];

	// Add markers for the given events
	eventMarkerMap = {};
	for (var i in events) {
		var event = events[i];
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(event.latitude, event.longitude),
			icon: '/images/marker.png',
			map: map, 
			title: event.name
		});
		markers.push(marker);
		attachInfo(marker, event);
		
		// Label markers
		var t = eval(i) + 1;
		var markerText = t;
		if (t < 10) { // one-digit labels need extra margin
			markerText = '&nbsp;' + t;
		}
		var label = new Label({
           map: map,
           position: marker.position,
           text: markerText
        });
        labels.push(label);
	}
	
	/** Creates an InfoWindow for the given marker and event information. */
	function attachInfo(marker, event) {
		var info = new google.maps.InfoWindow(
			{
				content: formatInfo(event),
				size: new google.maps.Size(75, 50)
			});
		google.maps.event.addListener(marker, 'click', function() {
			window.location.hash = '#eventId=' + event.id; 
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
		var content = '<div id="event_info">'
		
		// Name
		if (event.url == '') {
			content += '<b style="color: #0D83DD;">' + event.name + '</b>';
		} else {
			content += '<a href="' + event.url + '" target="_blank">' + event.name + '</a>';
		}
		content += '<br>';
		
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
				
		//Facebook Like Button
		var eventURL = 'http://4.latest.watodoo.appspot.com/#eventId=' + event.id ;

		//content +=' <a title="Post to Google Buzz" class="google-buzz-button" href="http://www.google.com/buzz/post" data-button-style="link"></a> &nbsp';
		content +='<br> <b>Share:</b> </br>'
		content +='<input type="text" style="width:350px" readonly="true" name="address" value="'+ eventURL+ '"/>';
		var facebookURL = '<iframe src="http://www.facebook.com/plugins/like.php?href=' + escape(eventURL) +'&amp;layout=standard&amp;show_faces=true&amp;width=450&amp;action=like&amp;colorscheme=light&amp;height=80" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:450px; height:80px;" allowTransparency="true"></iframe> ';
		content += '<br>';
        content += facebookURL;
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
		// Cannot start element ids with a number; only works in IE.
		innerTable.setAttribute('id', 'event_' + event.id);  
		innerTable.setAttribute('class', 'events_scroller_item');
		innerTable.setAttribute('onclick', 
			"window.location.hash = '#eventId=" + event.id + "'; openInfo(" + event.id + ");");
		innerTable.setAttribute('onmouseover', "this.style.backgroundColor = '#F3F8FB';");
		innerTable.setAttribute('onmouseout', "this.style.backgroundColor = 'white';");
		innerTable.setAttribute('cellpadding', '1px');
		
		// First row in the inner table contains marker and the link to the event
		var row1 = document.createElement('tr');
		innerTable.appendChild(row1);

		// Event marker tracking number
		var cell1 = document.createElement('td');
		cell1.setAttribute('rowspan', '2');
		row1.appendChild(cell1);
		cell1.setAttribute('class', 'events_scroller_item_id');
		cell1.innerHTML = eval(i) + 1;

		// Event link
		var cell2 = document.createElement('td');
		cell2.setAttribute('colspan', '3');
		row1.appendChild(cell2);
		if (event.url == '') {
			cell2.innerHTML = '<b style="color: #0D83DD;">' + event.name + '</b>';
		} else {
			var linkToEvent = document.createElement('a');
			cell2.appendChild(linkToEvent);
			linkToEvent.setAttribute('href', event.url);
			linkToEvent.setAttribute('target', '_blank');
			linkToEvent.setAttribute('style', 'color: #0D83DD;');
			linkToEvent.innerHTML = '<b>' + event.name + '</b>';
		}

		// Second row in the inner table contains category image and description
		var row2 = document.createElement('tr');
		innerTable.appendChild(row2);

		// Category image
		var cell3 = document.createElement('td');
		row2.appendChild(cell3);
		var categoryImage = document.createElement('img');
		cell3.appendChild(categoryImage);
		categoryImage.setAttribute('src', '/images/' + imageMap[event.category_id]);
		categoryImage.setAttribute('class', 'events_scroller_category_image');

		// Event venue
		var cell4 = document.createElement('td');
		row2.appendChild(cell4);
		cell4.setAttribute('class', 'events_scroller_venue');
		cell4.innerHTML = event.venue_name;

		// Event start date
		var cell5 = document.createElement('td');
		row2.appendChild(cell5);
		cell5.setAttribute('class', 'events_scroller_start_date');
		var date = new Date(event.start_date);
		cell5.innerHTML = daysOfWeek[date.getDay()]
		                  + ' ' + monthsOfYear[date.getMonth()]
		                  + ' ' + date.getDate();
	}
}

/** Opens the info window for a specified event. */
function openInfo(eventId) {
	if (currentInfoWindow) {
		currentInfoWindow.close();
	}
	var row = eventMarkerMap[eventId];
	if (row) {
		row.info.open(map, row.marker);
		currentInfoWindow = row.info;
	} else {
		alert('This event no longer exists.');
	}
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
				initChores();
            }
          }
        );
	}
}

/** Category filter click handler. */
function handleCategoryFilterClick(categoryId, categoryText) {
	// An infowindow might be open while clicking on a filter
	if (currentInfoWindow) {
		currentInfoWindow.close();
	}
	toggle('events_categories', 'categories_arrow');
    document.getElementById('selected_category').innerHTML = '<u>' + categoryText + '</u>';
    updateCategories(categoryId);
}

/** Time filter click handler. */
function handleTimeFilterClick(timeTag, timeText) {
	// An infowindow might be open while clicking on a filter
	if (currentInfoWindow) {
		currentInfoWindow.close();
	}
	toggle('time_options', 'time_arrow');
    document.getElementById('selected_time').innerHTML = '<u>' + timeText + '</u>';
    updateTimes(timeTag);	
}



/*Useful code snippets may be used later
//content += '<br>';
//content += '<a href="http://www.addtoany.com/share_save?linkurl=' +  eventURL +'&amp;linkname="><img src="http://static.addtoany.com/buttons/share_save_171_16.png" width="171" height="16" border="0" alt="Share/Bookmark"/></a>';


*/
