#!/usr/bin/env python

__author__ = 'Ajit Apte'

from django.utils import simplejson
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app


class EventsHandler(webapp.RequestHandler):
    @classmethod
    def _convert_events(cls, events):
        """Converts Yahoo Upcoming events to Furlango events."""
        furlango_events = []
        for event in events:
            furlango_event = {}
            furlango_event['id'] = event['id']
            furlango_event['name'] = event['name']
            furlango_event['url'] = event['url']
            furlango_event['venue_name'] = event['venue_name']
            furlango_event['venue_address'] = event['venue_address']
            furlango_event['venue_city'] = event['venue_city']
            furlango_event['venue_state_code'] = event['venue_state_code']
            furlango_event['venue_zip'] = event['venue_zip']
            furlango_event['start_date'] = event['start_date']
            furlango_event['start_time'] = event['start_time']
            furlango_event['end_date'] = event['end_date']
            furlango_event['end_time'] = event['end_time']
            furlango_event['ticket_url'] = event['ticket_url']
            furlango_event['description'] = EventsHandler._escape(event['description'])
            if event['ticket_free'] == 1:
                furlango_event['ticket_price'] = 'free'
            else:
                if event['ticket_price'] == '':
                    furlango_event['ticket_price'] = 'Not Available'
                else:
                    furlango_event['ticket_price'] = event['ticket_price']
            furlango_events.append(furlango_event)
        return furlango_events
        
    @classmethod
    def _escape(cls, text):
        """Escapes all HTML characters for security."""
        html_escape_table = {
            '&': '&amp;',
            '"': '&quot;',
            "'": '&apos;',
            '>': '&gt;',
            '<': '&lt;',
        }
        return "".join(html_escape_table.get(c, c) for c in text)
    
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        
        # required parameters
        lat = self.request.get('lat')
        lng = self.request.get('lng')
        
        # optional parameters
        query = self.request.get('query')
        categories = self.request.get('categories')
        min_date = self.request.get('min_date')
        max_date = self.request.get('max_date')
    
        url = ('http://upcoming.yahooapis.com/services/rest/?api_key=ea79f3c7b2' +
            '&method=event.search' +
            '&per_page=100' +
            '&format=json' +
            '&sort=popular-score-desc' +
            '&location=' + lat + ',' + lng)
        if query == '':
            url += ('&category_id=' + categories +
                    '&min_date=' + min_date +
                    '&max_date=' + max_date)
        else:
            url += '&search_text=' + query
        
        result = urlfetch.fetch(url)
        if result.status_code == 200:
            text = {'status': {'code': 0, 'message': 'OK'}}
            events = simplejson.loads(result.content)['rsp']['event']
            text['events'] = EventsHandler._convert_events(events)
            self.response.out.write(simplejson.dumps(text))
        else:
            self.response.out.write(simplejson.dumps(
                {'status': {'code': 1, 'message': 'Could not fetch data.'}}))
            
            
# Add more REST API handlers here
application = webapp.WSGIApplication([('/rest/v1/events', EventsHandler)], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == '__main__':
  main()
