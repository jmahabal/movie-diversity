'use strict';

var _ = require('lodash'); 
var fs = require('fs');
var jsonfile = require('jsonfile');

const functions = require('./functions.js');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const apikey = process.env.apikey;

const castLimit = 20;

// To schedule these tweets, we use a list of release dates
// Post the accompanying tweet on the day the movie is released

const cron = require('node-cron');
var moment = require('moment');
var Twit = require('twit');

const config = {
      twitter: {
        consumer_key: process.env.consumer_key,
        consumer_secret: process.env.consumer_secret,
        access_token: process.env.access_token,
        access_token_secret: process.env.access_token_secret
      }
    };
const T = new Twit(config.twitter);

// Twitter posting functions

const postToTwitter = function(statusData) {

  T.post('media/upload', { media_data: statusData.dataUrl }, function (err, data, response) {
    // now we can assign alt text to the media, for use by screen readers and
    // other text-based presentations and interpreters
    let mediaIdStr = data.media_id_string;
    let altText = functions.generateAltText(statusData.breakdown);
    console.log(altText);
    let meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };

    T.post('media/metadata/create', meta_params, function (err, data, response) {
      if (!err) {
        // now we can reference the media and post a tweet (media will attach to the tweet)
        let status = functions.generateTweet(statusData.castMemberCount, statusData.movieTitle, 
                     statusData.movieYear, statusData.breakdown, statusData.movieId,
                     functions.titleToHashtag);
        console.log(status);

        let params = { status: status, media_ids: [mediaIdStr] };
        if (statusData.replyTo && statusData.statusId) {
          params.status = `@${statusData.replyTo} ${status}`;
          params.in_reply_to_status_id = statusData.statusId;
        } else { // If we are posting to the main timeline, record that we've done so.
        let postedMovies = JSON.parse(fs.readFileSync('posted.json', 'utf8'));
        jsonfile.writeFile('posted.json', postedMovies.concat([[statusData.movieId, moment().format('L')]]), function(err) {
          let errorMessage = _.isNull(err) 
                     ? `Edited the already-posted json file.`
                           : `Could not write to already-posted json file because ${err}`;
          console.error(errorMessage);
        });
        }
        T.post('statuses/update', params, function (err, data, response) {
          console.log('posted to twitter!');
        });
      }
    });
  });
};

const checkIfPosted = function(statusData) {

  // Check if the post has already been posted to the general timeline
  // Only if the post isn't a replied to

  let postedMovies = JSON.parse(fs.readFileSync('posted.json', 'utf8'));
  // [movieId, datePosted]
  if (_.indexOf(postedMovies.map(x => x[0]), statusData.movieId) < 0) {
    // Check if it's been posted
    postToTwitter(statusData);
  } else if (moment(_.filter(postedMovies.map(x => x[0]) === statusData.movieId)[1]).add(6, 'months').isBefore(moment())) {
    // Check if it's been six months
    console.log('The movie had already been posted, but it has been a while.');
    postToTwitter(statusData);
  } else {
    console.log(`${statusData.movieTitle} has already been posted to the main Twitter feed.`);
  }
};

// Example of how to post to Twitter given just a movie title

// functions.getID('harry potter and the goblet of fire', apikey)
//   .then(movie => {
//     functions.getCastFromId(movie.id, apikey)
//       .then(genders => {
//         let year = movie.releaseDate.split('-')[0];
//         let dataUrl = functions.generateCanvas(_.toPairs(genders), `${movie.title}`, year, castLimit);
//         let statusData = {
//           'castMemberCount': castLimit,
//           'movieTitle': movie.title,
//           'movieYear': year,
//           'breakdown': _.toPairs(genders),
//           'dataUrl': dataUrl.split(',')[1],
//           'movieId': movie.id
//         };
//         // console.log(dataUrl);
//         checkIfPosted(statusData);
//       })
//       .catch(e => {
//         // Tweet saying that not enough data on cast members was found.
//         console.log(e);
//       });
//   })
//   .catch(e => {
//     // Tweet saying that the movie was not found.
//     console.log(e);
//   });

// Post tweets based on movie release schedule

const releases = require('./releases.json'); 
const releaseDates = _.toPairs(releases);

cron.schedule('0 0 0 * * *', function() {

  releaseDates.forEach(release => {
   if (moment().isSame(moment(release[1]), 'day')) {
     functions.getID(release[0], apikey)
       .then((movie) => {
         functions.getCastFromId(movie.id, apikey)
           .then(genders => {
             let year = movie.releaseDate.split('-')[0];
             let dataUrl = functions.generateCanvas(_.toPairs(genders), `${movie.title}`, year, castLimit);
               let statusData = {
                 'castMemberCount': castLimit,
                 'movieTitle': movie.title,
                 'movieYear': year,
                 'breakdown': _.toPairs(genders),
                 'dataUrl': dataUrl.split(',')[1],
                 'movieId': movie.id
               };
               // console.log(dataUrl);
               checkIfPosted(statusData);
           })
           .catch(e => {
             // Tweet saying that not enough data on cast members was found.
             console.log(e);
           });
       })
       .catch(e => {
         // Tweet saying that the movie was not found.
         console.log(e);
       });
    }
});

});

// When a user mentions (@s) the bot in a tweet, respond with the relevant info

const giveErrorTweet = function giveErrorTweet(message, statusId, replyTo) {
  let params = { status: `@${replyTo} ${message}`, in_reply_to_status_id: statusId };
  T.post('statuses/update', params, function (err, data, response) {
    console.log('replied to someone with an error message!');
  });
};

const username = process.env.twittername;
var stream = T.stream('statuses/filter', { track: username });

stream.on('tweet', function (tweet) {
  let replyTo = tweet.user.screen_name;
  let statusId = tweet.id_str;
  let tweetText = _.filter(tweet.text.split(' '), x => x.charAt(0) !== '@').join(' ');

  if (replyTo !== 'moviediversity') {
    // When mentioned, respond, but start with the username.
    functions.getID(tweetText, apikey)
     .then((movie) => {
        functions.getCastFromId(movie.id, apikey)
          .then(genders => {
            let year = movie.releaseDate.split('-')[0];
            let dataUrl = functions.generateCanvas(_.toPairs(genders), `${movie.title}`, year, castLimit);
            let statusData = {
              'castMemberCount': castLimit,
              'movieTitle': movie.title,
              'movieYear': year,
              'breakdown': _.toPairs(genders),
              'dataUrl': dataUrl.split(',')[1],
              'movieId': movie.id
            };
            checkIfPosted(statusData);
            let replyToStatusData = JSON.parse(JSON.stringify(statusData));
            replyToStatusData.replyTo = replyTo;
            replyToStatusData.statusId = statusId;
            postToTwitter(replyToStatusData); // Post again to the general timeline
        })
      .catch(e => {
        // Tweet saying that not enough data on cast members was found.
        giveErrorTweet(e, statusId, replyTo);
      });
    })
    .catch(e => {
      // Tweet back saying that the movie was not found.
      giveErrorTweet(e, statusId, replyTo);
    });
    console.log(`tweet detected: ${tweetText}`);
  }
  
});