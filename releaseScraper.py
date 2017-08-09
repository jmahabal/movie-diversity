# Movie Release Scraper 2017

from bs4 import BeautifulSoup
import requests
import json
import datetime

r = requests.get('http://www.the-numbers.com/movies/release-schedule/2017')
soup = BeautifulSoup(r.text, 'html.parser')

releases = {}
tracker_date = "2017-01-01"
for highlight in soup.find_all("tr", class_="highlight"):
	if highlight.get('id'): # first of its date
		tracker_date = highlight.get('id') # set new date
	else:
		# we want to not post them all at once, so we can wait a day or two
		new_date = datetime.datetime.strptime(tracker_date, '%Y-%m-%d') + datetime.timedelta(days=1)
		tracker_date = new_date.strftime('%Y-%m-%d')
	movie = highlight.find_all("td")[1].contents[0].contents[0].contents[0]
	releases[movie] = tracker_date

with open('releases.json', 'w') as fp:
    json.dump(releases, fp)
