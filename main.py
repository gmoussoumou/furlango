#!/usr/bin/env python

__author__ = 'Ajit Apte'

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app


class MainHandler(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/html'
    for line in open('main.html', 'r'):
        self.response.out.write(line)


application = webapp.WSGIApplication([('/', MainHandler)], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == '__main__':
  main()
