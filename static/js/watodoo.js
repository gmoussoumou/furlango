/**
 * All the meaty UI logic.
 *
 * @author Ajit Apte
 */

// ------------------- Global variables ---------------------------------
// Constants
var millisPerDay = 86400000;

// Map related variables
var currentInfoWindow;
var eventMarkerMap = {};
var geocoder;
var homeMarker;
var map;
var labels = []; // All currently displayed labels
var markers = []; // All currently displayed markers
var currentAddress; // Current home address

// Event related variables and methods
var allEvents = [];          // All events sorted by start date
var selectedCategories =     // Bit vector for selected categories. 0th position is reserved for 'any'.
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false];
var selectedTimes = {'today': false, 'tomorrow': false, 'weekend': false, 'any': false};	

var parameterMap = {'eventId': openInfo};  // Mapping from URL parameters to the corresponding action

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

// -------------------- Initialization logic -----------------------------

/** Bootstrap. */
function initialize() {
	// dropIEUsers();
	initMap();
	geocoder = new google.maps.Geocoder();
	geolocateByIP();
	initChores();
}

/** Shoo away IE users. */
function dropIEUsers() {
	var browserName = navigator.appName;
	if(browserName != null){
		if (browserName == "Microsoft Internet Explorer"){
			alert("Sorry, we do not support Internet Explorer as yet." 
			      + "Please try Chrome, Firefox or Safari.");
		}	
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

/** Geolocate by IP of the user. */
function geolocateByIP() {
	if (google.loader.ClientLocation) {
		var location = google.loader.ClientLocation;
		currentAddress = location.address.city + ', ' + location.address.region;
		storeMyLocation(location.latitude, location.longitude);
	} else {
		currentAddress = 'San Fransisco, CA';
		storeMyLocation(37.75, -122.45);
	}
}

/** Location-dependent initialization chores. */
function initChores() {
	// Default filter settings
	setCategories([0]);
	setTimes(['any']);
	initEventCategoryOptions();
	initEventTimeOptions();

	insertYahooUpcomingScript();
	insertGrouponDealsScript();
	markHome();
}

/** Initialize the event category options dialog. */
function initEventCategoryOptions() {
	// Set default
	$('#selected_category').html(categoryMap[0]);
	
	var container = $('#events_categories').empty();
	var table = $('<table></table>');
	container.append(table);

	// Add all categories to the dialog	
	for (var i in categoryMap) {
		var row = $('<tr></tr>');
		table.append(row);
		var col = $('<td></td>');
		row.append(col);
		col.attr("onmouseover", "this.style.backgroundColor = '#ADDFFF';");
		col.attr("onmouseout", "this.style.backgroundColor = 'white';");
		col.attr("onclick", "handleCategoryFilterClick(" + i + ", '" + categoryMap[i] + "');");
		col.html(categoryMap[i]);
	}
}


/** Category filter click handler. */
function handleCategoryFilterClick(categoryId, categoryText) {
	clearEventSpecificInfo();
	toggle('events_categories', 'categories_arrow');
    $('#selected_category').html('<u>' + categoryText + '</u>');

	// Set global array
	setCategories([categoryId]);
	
	// Update events
	insertYahooUpcomingScript();
}

/** Wipes all previously selected categories and sets the provided ones. */
function setCategories(categoryIds) {
	// Reset global array
	for (var i in selectedCategories) {
		selectedCategories[i] = false;
	}
	
	// Set provided values
	for (var i in categoryIds) {
		selectedCategories[categoryIds[i]] = true;
	}
}

/** Initialize the event times options dialog. */
function initEventTimeOptions() {
	// Set default
	$('#selected_time').html(timeMap['any']);
	
	var container = $('#time_options').empty();
	var table = $('<table></table>');
	container.append(table);

	// Add all time options to the dialog	
	for (var i in timeMap) {
		var row = $('<tr></tr>');
		table.append(row);
		var col = $('<td></td>');
		row.append(col);
		col.attr("onmouseover", "this.style.backgroundColor = '#ADDFFF';");
		col.attr("onmouseout", "this.style.backgroundColor = 'white';");
		col.attr("onclick", "handleTimeFilterClick('" + i + "', '" + timeMap[i] + "');");
		col.html(timeMap[i]);
	}
}

/** Time filter click handler. */
function handleTimeFilterClick(timeTag, timeText) {
	clearEventSpecificInfo();
	toggle('time_options', 'time_arrow');
    $('#selected_time').html('<u>' + timeText + '</u>');

	// Set global array
	setTimes([timeTag]);

	// Update events
	insertYahooUpcomingScript();
}

/** Wipes all previously selected times and sets the provided ones. */
function setTimes(timeTags) {
	// Reset global array
	for (var t in selectedTimes) {
		selectedTimes[t] = false;
	}
	
	// Set provided values
	for (var t in timeTags) {
		selectedTimes[timeTags[t]] = true;
	}
}

/** Marks home on the map. */
function markHome() {
	// Clear old home marker
	if (homeMarker) {
		homeMarker.setMap(null);
	}
	
	_home = new google.maps.LatLng(readCookie('latitude'), readCookie('longitude'));
	map.setCenter(_home);

	var image = new google.maps.MarkerImage(
		'images/home.png',
		new google.maps.Size(48, 48),
		new google.maps.Point(0, 0),   // origin
		new google.maps.Point(0, 32)); // anchor
	homeMarker = new google.maps.Marker({
		position: _home, 
		map: map, 
		title: "Home sweet home!",
		icon: image
	});
}

/** Fetch events from Yahoo! Upcoming. */
function insertYahooUpcomingScript() {
	insertLoader();

	var _location = readCookie('latitude') + ',' + readCookie('longitude');
	var url = 'http://upcoming.yahooapis.com/services/rest/?api_key=ea79f3c7b2'
		+ '&method=event.search'
		+ '&per_page=100'
		+ '&format=json'
		+ '&sort=popular-score-desc'
		+ '&callback=handleYahooResponse'
		+ '&location=' + _location;
		
	// Set categories.
	// If all categories is selected, add all categories.
	var categories = '';
	if (selectedCategories[0] == true) {
		for (var i in categoryMap) {
			if (i != 0) {
				categories += i + ',';
			}
		}
	// Otherwise add selected categories.
	} else {
		for (var i in selectedCategories) {
			if (selectedCategories[i] == true) {
				categories += i + ',';
			}
		}
	}
	// Remove trailing comma and add selected categories to URL
	categories = categories.substring(0, categories.length - 1);
	url += '&category_id=' + categories;
	
	// Set times.
	// If any time is selected, fetch all events from today till 3 months from now.
	var min_date = new Date();
	var max_date = new Date();
	if (selectedTimes['any'] == true) {
		max_date.setTime(max_date.getTime() + 90 * millisPerDay);

	// Gather all times to filter by
	} else {
		var today_min = new Date();
		var tomorrow_min = new Date();
		tomorrow_min.setTime(tomorrow_min.getTime() + millisPerDay);
		var weekend_min = new Date();
		var weekend_max = new Date();
		// We're good if today is a Sunday.
		if (today_min.getDay() != 0) {
			weekend_min.setTime(weekend_min.getTime() + (6 - weekend_min.getDay()) * millisPerDay);
			weekend_max.setTime(weekend_min.getTime() + 1 * millisPerDay);
		}
		var dates = {'today': {'min': today_min, 'max': today_min},
					 'tomorrow': {'min': tomorrow_min, 'max': tomorrow_min},
					 'weekend': {'min': weekend_min, 'max': weekend_max}};
		
		times = [];
		for (var key in selectedTimes) {
			if (selectedTimes[key] == true) {
				times.push(key);
			}
		}
		times.sort();
		
		min_date = dates[times[0]].min;
		max_date = dates[times[times.length - 1]].max;
	}
	// Add a min and a max date to the URL.
	url += '&min_date=' + min_date.getFullYear() + '-'  
		+ (padWithZero(min_date.getMonth() + 1)) + '-' + padWithZero(min_date.getDate());
	url += '&max_date=' + max_date.getFullYear() + '-'
		+ (padWithZero(max_date.getMonth() + 1)) + '-' + padWithZero(max_date.getDate());

	// Add search text if present in the search box
	var search_text = document.getElementById('search_events_box').value;
	if (search_text != 'Search events (e.g. salsa, concert)' && search_text != '') {
		url += '&search_text=' + escape(search_text);
	}

	$('head:first').append($("<script src='" + url + "'></script>"));
}

/** Insert the loader into the scroller, after removing all existing items. */
function insertLoader() {
	$('#events_scroller').empty()
		.append($("<div id='loader_container'></div>")
			.append($("<img src='images/loader.gif' alt='Loading...'></img>")));
}

/** Callback to handle event feed results. */
function handleYahooResponse(response) {
	if (response.rsp === undefined) {
		noEventsFound();
		allEvents = [];
		updateMarkers(allEvents);
	} else {
		// Sort events by start date and store in global list
		allEvents = response.rsp.event;
		allEvents.sort(function(event1, event2) {
			if (event1.start_date == null) {
				return -1;
			} else if (event2.start_date == null) {
				return 1;
			} else {
				if (event1.start_date < event2.start_date) {
					return -1;
				} else if (event1.start_date > event2.start_date) {
					return 1;
				} 
				return 0;	
			}
		});
		updateAllWidgets();
		processUrlParameters();
	}

	// Update the status whether there are events or not.
	var entered_address = document.getElementById('set_location_box').value;
	if (entered_address != 'Address, City, State or Zip' && entered_address != '') {
		currentAddress = entered_address;
	}
	displayStatus(currentAddress);
}

/** Inserts text into the scroller saying that no events were found. */
function noEventsFound() {
	$('#events_scroller').empty()
		.append($("<div id='no_events_container'>Sorry, no events found.</div>"));	
}

/** 
 * Displays a status message about the events being displayed. The message is formatted like:
 * 'Showing all Music events near Mountain View for Today matching "salsa"'.
 *
 * @param address to be displayed in the status message
 */
function displayStatus(address) {
	var message = 'Showing all ';

	// categories
	var categories = '';
	if (selectedCategories[0] != true) {
		for (var i in selectedCategories) {
			if (selectedCategories[i] == true) {
				categories += categoryMap[i] + ',';
			}
		}
	}
	categories = categories.substring(0, categories.length - 1);
	message += categories.toLowerCase() + ' events';
	
	// address
    message += ' near ' + address;

	// times
	var times = '';	
	if (selectedTimes['any'] != true) {
		for (var key in selectedTimes) {
			if (selectedTimes[key] == true) {
				times += timeMap[key] + ','
			}
		}
		times = times.substring(0, times.length - 1);
		message += ', for ' + times.toLowerCase();
	}
	
	// search string
	var search_box = document.getElementById('search_events_box');
	if (search_box.value != 'Search events (e.g. salsa, concert)' && search_box.value != '') {
		message += ', matching "' + search_box.value + '"';
	}

	document.getElementById('status').innerHTML = message;
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

/** Insert a script element for invoking the Groupon deals script. */
function insertGrouponDealsScript() {
	var lat = readCookie('latitude');
	var lng = readCookie('longitude');
	var _grouponUrl = 'http://www.groupon.com/api/v1/deals'
		+ '?X-GrouponToken=827581b3617e5ac54482be2dcc23a12c5a36c2fd'
		+ '&lat=' + lat
		+ '&lng=' + lng
		+ '&format=json'
		+ '&callback=handleGrouponResponse';
	$('head:first').append($('<script>').attr('src', _grouponUrl));
}

/** Display all groupon deals. */
function handleGrouponResponse(response) {
	if (response.status.message != 'Ok') {
		alert('Error fetching deals. Please try after some time.');
		return;
	}
	
	var container = $('#groupon_deals').empty();
	for (var i in response.deals) {
		var deal = response.deals[i];
		
		var link = $("<a target='_blank'></a>");
		link.attr('href', deal.deal_url);
		link.html(deal.title + '<br>');
		container.append(link);
		
		var image = $('<img></img>');
		image.attr('src', deal.medium_image_url);
		container.append(image);
		
		container.append('<br><br>');
	}
}

/** Updates all user-visible widgets. */
function updateAllWidgets() {
	duplicateRemovedEvents = removeDuplicateEvents(allEvents);
	updateMarkers(duplicateRemovedEvents);
	updateScroller(duplicateRemovedEvents);
}

/** 
 * Removing duplicate events (by name) irrespective of their date.
 * Returns duplicate removed list. Lower duplicates are removed.
 */ 
function removeDuplicateEvents(sortedEvents) {
	var eventHashmap = new Array();
	for (var i in sortedEvents) {
			eventHashmap[sortedEvents[i].name] = [];
	}
	for (var i in sortedEvents){
			eventHashmap[sortedEvents[i].name].push(sortedEvents[i]);
	}
	events = [];
	for (var key in eventHashmap) {
			events.push((eventHashmap[key])[0]);
	}
	return events;
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
		event.name = event.name + ''; // Defense against titles like '1964'
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(event.latitude, event.longitude),
			icon: 'images/marker.png',
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
			openInfo(event.id);
		});
		eventMarkerMap[event.id] = {'info': info, 'marker': marker, 'event': event};
	}
	
	/** Formats information about the given event into human readable form. */
	function formatInfo(event) {
		var content = '<div id="event_info">'			
		
		var eventURL = window.location.protocol + '//' + window.location.host + '/?eventId=' + event.id;
		
		//facebook "f" button 
		content += '<img style="margin-bottom:-4px" src="http://static.ak.fbcdn.net/images/fbconnect/login-buttons/connect_white_small_short.gif"' +  
						 'onclick="publishFacebookStream(\'' + event.name + '\',\'' + eventURL + '\')"/>';
		content += '  ';
		
		// Name
		if (event.url == '') {
			content += '<b style="color: #0D83DD;">' + event.name + '</b>';
		} else {
			content += '<a href="' + event.url + '" target="_blank">' + event.name + '</a>';
		}
		
		content += '<br><br>';
		
		
		// Description
		content += event.description + '</b><p></p>';
		
		// Address
		content += '<b>Venue:&nbsp;</b>' + event.venue_name + ', ' + event.venue_address + ', ' + 
			event.venue_city + ' ' + event.venue_state_code + ' ' + event.venue_zip + '<br>';

		// Dates
		content += '<b>Date:&nbsp;</b>' + convertDate(event.start_date, event.start_time);
		if (event.end_date.indexOf('-') >= 0) {
			content += ' to ' + convertDate(event.end_date, event.end_time);
		}
		content += '<br>';

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
				
				
		// Share Link
		content +='<br><b>Share:</b></br>'
		content +='<input type="text" style="width:300px" readonly="true" name="address" value="'+ eventURL+ '"/>';
		
		content += '</div>';
		return content;
	}
}

/** Updates the scroller with the given events. */
function updateScroller(events) {
	var scroller = $('#events_scroller').empty();
	
	// Add movies URL
	var movieItem = $("<div id='movies_scroller_item'></div>");
	scroller.append(movieItem);

	var moviesImage =
		$("<img id='movie_scroller_image' src='images/movies.png' style='float:left'></img>");
	movieItem.append(moviesImage);

	var link = $("<a id='movie_scroller_link' target='_blank'>Movies playing near you</a>");
	var movieUrl = 'http://www.google.com/movies?view=map&near=' + 
	                escape(readCookie('latitude')) + ',' + escape(readCookie('longitude'));
	link.attr('href', movieUrl);
	movieItem.append(link);

	movieItem.append($("<img src='images/external_link.png'></img>"));
	
	// Add events to scroller
	for (var i in events) {
		var event = events[i];
		var row = $('<tr></tr>');
		scroller.append(row);
		
		// Table in each row
		var innerTable = $('<table></table>');
		row.append(innerTable);
		// Cannot start element ids with a number; only works in IE.
		innerTable.attr('id', 'event_' + event.id);  
		innerTable.attr('class', 'events_scroller_item');
		innerTable.attr('onclick', "openInfo(" + event.id + ");");
		innerTable.attr('onmouseover', "this.style.backgroundColor = '#ADDFFF';");
		innerTable.attr('onmouseout', "this.style.backgroundColor = 'white';");
		innerTable.attr('cellpadding', '1px');
		
		// First row in the inner table contains marker and the link to the event
		var row1 = $('<tr></tr>');
		innerTable.append(row1);

		// Event marker tracking number
		var cell1 = $("<td class='events_scroller_item_id' rowspan='2'></td>");
		cell1.html(eval(i) + 1);
		row1.append(cell1);

		// Event link
		var cell2 = $("<td colspan='3'></td>");
		row1.append(cell2);
		if (event.url == '') {
			cell2.html('<b style="color: #0D83DD;">' + event.name + '</b>');
		} else {
			var linkToEvent = $("<a target='_blank' style='color: #0D83DD'></a>");
			linkToEvent.attr('href', event.url);
			linkToEvent.html('<b>' + event.name + '</b>');
			cell2.append(linkToEvent);
		}

		// Second row in the inner table contains category image and description
		var row2 = $('<tr></tr>');
		innerTable.append(row2);

		// Category image
		var cell3 = $('<td></td>');
		row2.append(cell3);
		var categoryImage = $("<img class='events_scroller_category_image'></img>");
		categoryImage.attr('src', 'images/' + imageMap[event.category_id]);
		cell3.append(categoryImage);

		// Event venue
		var cell4 = $("<td class='events_scroller_venue'></td>");
		cell4.html(event.venue_name + ', ' + event.venue_city);
		row2.append(cell4);

		// Event start date
		var cell5 = $("<td class='events_scroller_start_date'></td>");
		var date = new Date(event.start_date);
		cell5.html(convertDate(event.start_date, event.start_time));
		row2.append(cell5);
	}
}

/** Opens the info window for a specified event. */
function openInfo(eventId) {
	window.location.hash = '#eventId=' + eventId;
	var row = eventMarkerMap[eventId];
	document.title = row.event.name.substring(0, 15) + ' - Furlango';
	if (currentInfoWindow) {
		currentInfoWindow.close();
	}
	if (row) {
		row.info.open(map, row.marker);
		currentInfoWindow = row.info;
	} else {
		alert('This event no longer exists.');
	}
}

/** Stores the user's location in a cookie. */
function storeMyLocation(latitude, longitude) {
	writeCookie('latitude', latitude);
	writeCookie('longitude', longitude);
}

/**  Geocode user provided location, store cookie and reload page. **/
function search() {
	clearEventSpecificInfo();
	// Fetch address from the set location box.
	// If default or blank, use the home address.
	var address = $('#set_location_box').val();
	if (address == 'Address, City, State or Zip' || address == '') {
		address = currentAddress;
	}
	if (geocoder) {
        geocoder.geocode (
        	{'address': address},
          	function(results, status) {
            	if (status == google.maps.GeocoderStatus.OK) {
					var location = results[0].geometry.location;
					storeMyLocation(location.lat(), location.lng());
					initChores();
            	}
            }
        );
	}
}

/** Clears event-specific information displayed on the page. */
function clearEventSpecificInfo() {
	window.location.hash = '';
	document.title = 'Events around you - Furlango';
	if (currentInfoWindow) { // defined in watodoo.js
		currentInfoWindow.close();
	}
}

/** Opens stream publish pop up for publishing to Facebook. 
	For publishing event, pass in eventName and eventURL
	For publishing from furlango homepage, call without any parameters
*/
function publishFacebookStream(eventName,eventURL) {
	
	if (eventName == null || eventURL == null) {
		// publish stream for furlango homepage (no specific event).
		var caption = '{*actor*} likes FurlanGo';
		var eventURL = 'http://www.furlango.com';
		var eventName = '';
		var user_prompt = 'Share your thoughts about FurlanGo';
	}
	else {
		// publish stream for specific event (with passed parameters)
		var caption = '{*actor*} likes ' + '\'' + eventName + '\' on FurlanGo';
		var user_prompt = 'Share your thoughts about the event';
	}
	FB.ui(
	   {
		 display: 'popup',
	     method: 'stream.publish',
	     message: '',
	     attachment: {
	       name: eventName,
	       caption: caption,
	       description: (
	         'Looking for something cool to do? Concerts, festivals, movies, music? Try FurlanGo!'
	       ),
	       href: eventURL
	     },
	     action_links: [
	       { text: 'Find cool events', href: 'http://www.furlango.com'}
	     ],
	     user_message_prompt: user_prompt
	   },
	   function(response) {
	   }
	 );
}
