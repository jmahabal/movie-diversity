# [Movie Gender Diversity Bot](https://www.twitter.com/moviediversity)

Visit the bot on Twitter `@moviediversity`.

![Dunkirk as Example](dunkirk.jpg)

This is a Twitter bot that posts a bar chart of the breakdown by gender of
various movies. I grab the data from [the Movie DB](themoviedb.org), a website
similar to IMDB but with an API.

The bot has two functions:

1. Post a movie's breakdown on (or close to) its release date
   * This ensures that the movie is already in the public consciousness, which
     might be more engaging
   * This also provides a consistent stream of tweets even without human
     intervention
2. Reply to users who request an analysis of a specific movie
   * The bot will also post the movie analysis to its main timeline, if the
     movie had not been posted about before

# How it Works

The process of creating an 'analysis' kicks off with a movie title. This title
is fed into the MovieDB search API, after which the bot selects the movie that
is the first result. Once there is a movie associated with the request, the bot
grabs the cast members and aggregates the genders of the first 20 cast members.
The cast members are billed accordingly to importance, so choosing the top 20
should lead to a accurate study, as minor characters with little screen time are
not as relevant (though definitely still important!) This data then gets passed
into a function that draws the bar chart on a canvas. This canvas is exported as
a dataURL which can then in turn be passed to Twitter.

Since the bot is also supposed to post a movie's information on its release
date, I needed some way to keep track of that information. Right now what I do
is use Python to scrape a movie release date site and save that information to a
JSON file. In the future I'd want a cronjob of some type to automate this
process as well.

The bot was written in Javascript. I have [Travis](https://travis-ci.org/)
hooked up to the
[Github repository](https://github.com/jmahabal/movie-diversity) to test parts
of the code before deploying to [Heroku](https://www.heroku.com/).

# The Future

* Expand analysis to include ethnicity information as well, in addition to other
  groups
* Automate the code that finds movie release dates

# Credits

![The Movie DB](themoviedb.png)

[The Movie DB](https://www.themoviedb.org/documentation/api)

The Twitter profile and cover photos are by Florian Klauer and Andrew Ridley
from Unsplash.
