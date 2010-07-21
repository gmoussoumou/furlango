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


// -------------------- Initialization logic -----------------------------

/** Bootstrap. */
function initialize() {
	dropIEUsers();
	initMap();
	geocoder = new GClientGeocoder();
	var isSearch = readCookie('search');
	if (isSearch != 'true' || isSearch == null) {
		whereAmI();
	} else {
		initChores();
	}
}

/** Shoo away IE users. */
function dropIEUsers() {
	var browserName = navigator.appName;
	if(browserName != null){
		if (browserName == "Microsoft Internet Explorer"){
			alert("Sorry, we do not support Internet Explorer as yet. Please try Firefox or Chrome.");
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

/** Location-dependent initialization chores. */
function initChores() {
	displayDefaultLocation();
	
	// Default filter settings
	setCategories([0]);
	setTimes(['any']);
	initEventCategoryOptions();
	initEventTimeOptions();

	insertYahooUpcomingScript();
	// TODO(ajit): Re-insert for v2.1 launch
	// insertGrouponDealsScript();
	markHome();
}

/** Displays default location in the set location box. */
function displayDefaultLocation() {
	var set_location_box = document.getElementById('set_location_box');
	if (geocoder) {
        geocoder.getLocations (
			new GLatLng(readCookie('latitude'), readCookie('longitude')),
			function(addresses) {
				if(addresses.Status.code != 200) {
				    // The user should not care about this, so ignore.
				} else {
					// Set minimum precision level.
					var i = 3;
					while (!addresses.Placemark[i] && i >= 0) {
						i--;
					}
					if (i >= 0) { 
						address = addresses.Placemark[i].address;
						var box = document.getElementById('set_location_box');
						box.value = address;
						box.setAttribute('style', 'color: black');
				    }
				}
			}
        );
	}
}

/** Initialize the event category options dialog. */
function initEventCategoryOptions() {
	// Set default
	document.getElementById('selected_category').innerHTML = categoryMap[0];
	
	var container = document.getElementById('events_categories');
	removeAllChildren(container);
	var table = document.createElement('table');
	container.appendChild(table);

	// Add all categories to the dialog	
	for (var i in categoryMap) {
		var row = document.createElement('tr');
		table.appendChild(row);
		var col = document.createElement('td');
		row.appendChild(col);
		col.setAttribute("onmouseover", "this.style.backgroundColor = '#ADDFFF';");
		col.setAttribute("onmouseout", "this.style.backgroundColor = 'white';");
		col.setAttribute("onclick", 
		                 "handleCategoryFilterClick(" + i + ", '" + categoryMap[i] + "');");
		col.innerHTML = categoryMap[i];            
	}
}


/** Category filter click handler. */
function handleCategoryFilterClick(categoryId, categoryText) {
	clearEventSpecificInfo();
	toggle('events_categories', 'categories_arrow');
    document.getElementById('selected_category').innerHTML = '<u>' + categoryText + '</u>';

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
	document.getElementById('selected_time').innerHTML = timeMap['any'];
	
	var container = document.getElementById('time_options');
	removeAllChildren(container);
	var table = document.createElement('table');
	container.appendChild(table);

	// Add all time options to the dialog	
	for (var i in timeMap) {
		var row = document.createElement('tr');
		table.appendChild(row);
		var col = document.createElement('td');
		row.appendChild(col);
		col.setAttribute("onmouseover", "this.style.backgroundColor = '#ADDFFF';");
		col.setAttribute("onmouseout", "this.style.backgroundColor = 'white';");
		col.setAttribute("onclick", 
		                 "handleTimeFilterClick('" + i + "', '" + timeMap[i] + "');");
		col.innerHTML = timeMap[i];            
	}
}

/** Time filter click handler. */
function handleTimeFilterClick(timeTag, timeText) {
	clearEventSpecificInfo();
	toggle('time_options', 'time_arrow');
    document.getElementById('selected_time').innerHTML = '<u>' + timeText + '</u>';

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

/** Fetch events from Yahoo! Upcoming. */
function insertYahooUpcomingScript(search_text) {
	insertLoader();

	var _location = readCookie('latitude') + ',' + readCookie('longitude');
	var url = 'http://upcoming.yahooapis.com/services/rest/?api_key=ea79f3c7b2'
		+ '&method=event.search'
		+ '&per_page=100'
		+ '&format=json'
		+ '&sort=popular-score-desc'
		+ '&callback=handleYahooResponse'
		+ '&location=' + _location;
		
	// Search text annulls all other filters.
	if (search_text === undefined) {
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
		// If any time is selected, fetch all events from today till 2 months from now.
		var min_date = new Date();
		var max_date = new Date();
		if (selectedTimes['any'] == true) {
			min_date.setDate(min_date.getDate());
			max_date.setDate(max_date.getDate() + 90);

		// Gather all times to filter by
		} else {
			var today_min = new Date();
			var tomorrow_min = new Date();
			tomorrow_min.setDate(tomorrow_min.getDate() + 1);
			// The weekend is from the coming Friday to the coming Monday.
			var weekend_min = new Date();
			weekend_min.setDate(weekend_min.getDate() + (5 - weekend_min.getDay()));
			var weekend_max = new Date();
			weekend_max.setDate(weekend_min.getDate() + 3);
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
		url += '&min_date=' + min_date.getFullYear() 
			+ '-' + (padWithZero(min_date.getMonth() + 1)) + '-' + min_date.getDate();
		url += '&max_date=' + max_date.getFullYear() 
			+ '-' + (padWithZero(max_date.getMonth() + 1)) + '-' + max_date.getDate();

	} else {
		url += '&search_text=' + escape(search_text);
	}

	var eventsScript = document.createElement('script');
	eventsScript.src = url;
	document.getElementsByTagName('head')[0].appendChild(eventsScript);
}

/** Insert the loader into the scroller. */
function insertLoader() {
	var scroller = document.getElementById('events_scroller');
	removeAllChildren(scroller);
	var row = document.createElement('tr');
	row.setAttribute('id', 'loader_container');
	scroller.appendChild(row);
	var cell = document.createElement('td');
	row.appendChild(cell);
	var loaderImage = document.createElement('img');
	loaderImage.setAttribute('src', 'images/loader.gif');
	loaderImage.setAttribute('alt', 'Loading...');
	cell.appendChild(loaderImage);
}

/** Callback to handle event feed results. */
function handleYahooResponse(response) {
	if (response.rsp === undefined) {
		noEventsFound();
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

	updateAllWidgets();
	processUrlParameters();
}

/** Inserts text into the scroller saying that no events were found. */
function noEventsFound() {
	var scroller = document.getElementById('events_scroller');
	removeAllChildren(scroller);
	var row = document.createElement('tr');
	row.setAttribute('id', 'no_events_container');
	scroller.appendChild(row);
	var cell = document.createElement('td');
	row.appendChild(cell);
	cell.innerHTML = 'Sorry, no events found.';
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

	var grouponScript = document.createElement('script');
	grouponScript.src = 'http://www.groupon.com/api/v1/deals'
		+ '?X-GrouponToken=827581b3617e5ac54482be2dcc23a12c5a36c2fd'
		+ '&lat=' + lat
		+ '&lng=' + lng
		+ '&format=json'
		+ '&callback=handleGrouponResponse';

	document.getElementsByTagName('head')[0].appendChild(grouponScript);
}

/** Display all groupon deals. */
function handleGrouponResponse(response) {
	if (response.status.message != 'Ok') {
		alert('Error fetching deals. Please try after some time.');
		return;
	}
	
	var container = document.getElementById('groupon_deals');
	removeAllChildren(container);
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
				
		// Facebook 'Like' Button
		var eventURL = window.location.protocol + '//' + window.location.host + '/?eventId=' + event.id;
		content +='<br><b>Share:</b></br>'
		content +='<input type="text" style="width:350px" readonly="true" name="address" value="'+ eventURL+ '"/>';
		var facebookURL = '<iframe src="http://www.facebook.com/plugins/like.php?href=' + escape(eventURL) +
		                  '&amp;layout=standard&amp;show_faces=false&amp;width=450&amp;action=like&amp;colorscheme=light&amp;height=80"' +
		                  'scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:450px; height:20px;" allowTransparency="true"></iframe>';
		content += '<br>';
        content += facebookURL;
		content += '</div>';
		return content;
	}
}

/** Updates the scroller with the given events. */
function updateScroller(events) {
	var scroller = document.getElementById('events_scroller');
	removeAllChildren(scroller);
	
	// Add movies URL
	var movieItem = document.createElement('div');
	movieItem.setAttribute('id', 'movies_scroller_item');
	scroller.appendChild(movieItem);

	var moviesImage = document.createElement('img');
	moviesImage.setAttribute('id', 'movie_scroller_image');
	moviesImage.setAttribute('src', 'images/movies.png');
	moviesImage.setAttribute('style', 'float: left');
	movieItem.appendChild(moviesImage);

	var link = document.createElement('a');
	link.setAttribute('id', 'movie_scroller_link');
	var movieUrl = 'http://www.google.com/movies?view=map&near=' + 
	                escape(readCookie('latitude')) + ',' + escape(readCookie('longitude'));
	link.setAttribute('href', movieUrl);
	link.setAttribute('target', '_blank');
	link.innerHTML = 'Movies playing near you';
	movieItem.appendChild(link);

	var external_link = document.createElement('img');
	external_link.setAttribute('src', 'images/external_link.png');
	movieItem.appendChild(external_link);
	
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
		innerTable.setAttribute('onclick', "openInfo(" + event.id + ");");
		innerTable.setAttribute('onmouseover', "this.style.backgroundColor = '#ADDFFF';");
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
		categoryImage.setAttribute('src', 'images/' + imageMap[event.category_id]);
		categoryImage.setAttribute('class', 'events_scroller_category_image');

		// Event venue
		var cell4 = document.createElement('td');
		row2.appendChild(cell4);
		cell4.setAttribute('class', 'events_scroller_venue');
		cell4.innerHTML = event.venue_name + ', ' + event.venue_city;

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
	// Reset the search events box.
	var search_events_box = document.getElementById('search_events_box');
	search_events_box.value = 'Search events (e.g. salsa, concert)';
    search_events_box.setAttribute('style', 'color: gray');

	clearEventSpecificInfo();
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

/** Search events in the current location with the provided text. */
function searchEvents(search_text) {
	clearEventSpecificInfo();
	insertYahooUpcomingScript(search_text);
}

/** Clears event-specific information displayed on the page. */
function clearEventSpecificInfo() {
	window.location.hash = '';
	document.title = 'Events around you - Furlango';
	if (currentInfoWindow) { // defined in watodoo.js
		currentInfoWindow.close();
	}
}
