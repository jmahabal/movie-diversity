// These functions grab an IMDB movie / tv series
// Find the 20 highest billed cast members
// Analyze their gender, and aggregate

// This function should run whenever a movie premieres

// The output should be a tweet like
// Of the 20 top-billed cast members in Dunkirk (2017)...
// < bar chart >

// We use this API
// https://www.themoviedb.org

// ***** //

var rpn = require('request-promise-native'); 
var _ = require('lodash'); 
var fs = require('fs');
var jsonfile = require('jsonfile');
const secrets = require('./secrets.json'); 

// const secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));

const apikey = secrets.moviedb_apikey;

// Get ID of a Movie given it's title
// Return a promise
const getID = function(movieTitle) {
	return new Promise((resolve, reject) => {
		let baseUrl = 'https://api.themoviedb.org/3/search/movie?api_key=' + apikey + '&query=';
		rpn.get(baseUrl+movieTitle.split(' ').join('+'))
		  .then(response => {
		  	let movie = JSON.parse(response).results[0];
		  	resolve({id: movie.id, title: movie.title, releaseDate: movie.release_date});
		  })
		  .catch(e => {
		  	reject(`I could not find film information for "${movieTitle}".`);
		  });
	})
}

// Given a cast member, get gender
// Using the API specs
const determineGender = function(gender) {
	if (gender === 1) {
		return 'Female';
	} else if (gender === 2) {
		return 'Male';
	} 
	return 'N/A';
}

// Given a movie title, return it's cast members
// If the movie doesn't have many people, we exclude it from our analysis
// We keep only the top 20 billed people
// But should this value expand to the entire cast (like if there are 50 folks, why not?)
const castLimit = 20;
const getCastFromId = function(movieId) {
	return new Promise((resolve, reject) => {
		let baseUrl = 'https://api.themoviedb.org/3/movie/' + movieId + '?append_to_response=credits&api_key=' + apikey;
		rpn.get(baseUrl)
		  .then(response => {
		  	if (JSON.parse(response).credits.cast.length > 19) {
			  	resolve(_.countBy(JSON.parse(response).credits.cast.splice(0, castLimit).map(x => determineGender(x.gender))));
		  	}
	  		reject(`I could not gather enough information on the cast members of this film.`)
		  })
	})
}

// To generate a gender bar graph we'll use D3
// We need an object in the form:
// const sampleData = [['Female', 6], ['Male', 6], ['N/A', 6]];

var d3 = require('d3');

const width = 320; // Need a 2:1 ratio
const height = 160;
const margin = {"top": 40, "bottom": 40, "right": 40, "left": 70};

const generateCanvas = function(data, title, year, castMemberCount) {

    let Canvas = require('canvas');
    let canvas = new Canvas(width + margin.left + margin.right, height + margin.top + margin.bottom);
    let ctx = canvas.getContext('2d');
    // ctx.scale(2, 2);

    // ctx.fillStyle = "rgba(250,239,209,1)";
    ctx.fillStyle = "white";

    ctx.fillRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
    ctx.fillStyle = "black";

    ctx.translate(margin.left + 0.5, margin.top + 0.5);

    let xScale = d3.scaleLinear().domain([0, castMemberCount]).range([0, width]);
    let yScale = d3.scaleBand().domain(["Female", "Male", "N/A"]).range([0, height]).paddingOuter(0.3).paddingInner(0.3);

    let xTickCount = 5;
    let xTicks = xScale.ticks(xTickCount);

    ctx.beginPath();
    xTicks.forEach(function(d) {
      ctx.moveTo(xScale(d), height);
      ctx.lineTo(xScale(d), height + 6);
    });
    ctx.strokeStyle = "black";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "10px 'Roboto'";
    xTicks.forEach(function(d) {
      ctx.fillText(d, xScale(d), height + 8);
    });

    ctx.beginPath();

    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "12px 'Roboto'";

    yScale.domain().forEach(function(d) {
      ctx.fillText(d, -12 + 0.5, yScale(d) + yScale.bandwidth() / 2  + 0.5);
    });

    // For filling in the line across the x axis
    ctx.beginPath();
    ctx.moveTo(0, height + 0.5);
    ctx.lineTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, height + 0.5);
    ctx.strokeStyle = "black";
    ctx.stroke();

    // Text
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "10px 'Roboto'";
    ctx.fillText(`Top ${castMemberCount} Billed Cast Members`, width, height - 4);

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = "16px 'Roboto'";
    ctx.fillText(`${title} (${year})`, width/2, -6);

    ctx.restore();

    // ctx.fillStyle = "rgb(116,160,137)";
    ctx.fillStyle = "rgb(180,15,32)";

    data.forEach(function(d) {
      ctx.fillRect(0.5, yScale(d[0]) + 0.5, xScale(d[1]), yScale.bandwidth());
    });

    // canvas.toDataURL('image/jpeg', 1, function(err, jpeg){ 
    //   console.log(jpeg);
    // })

    return canvas.toDataURL();

}

// To schedule these tweets, we use a list of release dates
// Post the accompanying tweet on the day the movie is released

const cron = require('node-cron');
const releases = require('./releases.json'); 
var moment = require('moment');
var Twit = require('twit');

const releaseDates = _.toPairs(releases);

const config = {
      twitter: {
        consumer_key: secrets.consumer_key,
        consumer_secret: secrets.consumer_secret,
        access_token: secrets.access_key,
        access_token_secret: secrets.access_secret
      }
    };
const T = new Twit(config.twitter);

const generateTweet = function(castMemberCount, movieTitle, movieYear, data, movieId) {
	let majority = _.filter(data, x => x[1] > castMemberCount/2);
	let max = _.filter(data, y => y[1] === _.maxBy(data, x => parseInt(x[1]))[1]).map(z => z[0].toLowerCase()).join(' or ');
	let largestCohortText = _.isEmpty(majority) 
						  ? `the plurality were ${max}`
						  : `the majority were ${majority[0][0].toLowerCase()}`;
	return `Of the ${castMemberCount} top-billed cast members in ${movieTitle} (${movieYear}), ${largestCohortText}.\n\nhttps://www.themoviedb.org/movie/${movieId}`;
}

const generateAltText = function(pairedData) {
	return pairedData.map(x => `${x[0]}s: ${x[1]}`).join("; ");
}

const postToTwitter = function(statusData) {

	T.post('media/upload', { media_data: statusData.dataUrl }, function (err, data, response) {
		// now we can assign alt text to the media, for use by screen readers and
		// other text-based presentations and interpreters
		let mediaIdStr = data.media_id_string;
		let altText = generateAltText(statusData.breakdown);
		console.log(altText);
		let meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

		T.post('media/metadata/create', meta_params, function (err, data, response) {
		  if (!err) {
		    // now we can reference the media and post a tweet (media will attach to the tweet)
		    let status = generateTweet(statusData.castMemberCount, statusData.movieTitle, 
		    						   statusData.movieYear, statusData.breakdown, statusData.movieId);
		    console.log(status);

		    let params = { status: status, media_ids: [mediaIdStr] }
		    if (statusData.replyTo && statusData.statusId) {
			    params['status'] = `@${statusData.replyTo} ${status}`;
			    params['in_reply_to_status_id'] = statusData.statusId;
		    } else { // If we are posting to the main timeline, record that we've done so.
				let postedMovies = require('./posted.json');
				jsonfile.writeFile('posted.json', postedMovies.concat(statusData.movieId), function(err) {
				  let errorMessage = _.isNull(err) 
				  				   ? `Edited the already-posted json file.`
				                   : `Could not write to already-posted json file because ${err}`;
				  console.error(errorMessage);
				})
		    }
		    T.post('statuses/update', params, function (err, data, response) {
		      console.log("posted to twitter!")
		    })
		  }
		})
	})
}

const checkIfPosted = function(statusData) {

	// Check if the post has already been posted to the general timeline
	// Only if the post isn't a replied to

	let postedMovies = require('./posted.json');
	if (_.indexOf(postedMovies, statusData.movieId) < 0) {
		postToTwitter(statusData);
	} else {
		console.log(`${statusData.movieTitle} has already been posted to the main Twitter feed.`)
	}
}

// cron.schedule('5 * * * * *', function() {

//   releaseDates.forEach(release => {
//   	if (moment().isSame(moment(release[1]), 'day')) {


		getID("harry potter azkaban")
			.then((movie) => {
				getCastFromId(movie.id)
					.then(genders => {
						let year = movie.releaseDate.split("-")[0];
						let dataUrl = generateCanvas(_.toPairs(genders), `${movie.title}`, year, castLimit);
					    let statusData = {
					      "castMemberCount": castLimit,
					      "movieTitle": movie.title,
					      "movieYear": year,
					      "breakdown": _.toPairs(genders),
					      "dataUrl": dataUrl.split(",")[1],
					      "movieId": movie.id
					    }
					    // console.log(dataUrl);
					    checkIfPosted(statusData);
					})
					.catch(e => {
						// Tweet saying that not enough data on cast members was found.
						console.log("e3", e)
					});
			})
			.catch(e => {
				// Tweet saying that the movie was not found.
				console.log("e2", e)
			});

// 	};
//   })

// });

// When a user mentions (@s) the bot in a tweet, respond with the relevant info

const giveErrorTweet = function(message, statusId, replyTo) {
  let params = { status: `@${replyTo} ${message}`, in_reply_to_status_id: statusId };
  T.post('statuses/update', params, function (err, data, response) {
    console.log("replied to someone with an error message!");
  })
}

// const username = '@moviediversity';
// var stream = T.stream('statuses/filter', { track: username });

// stream.on('tweet', function (tweet) {
//   let replyTo = tweet.user.screen_name;
//   let statusId = tweet.id_str;
//   let tweetText = _.filter(tweet.text.split(" "), x => x.charAt(0) != '@').join(" ");

//   // When mentioned, respond, but start with the username.
//   getID(tweetText)
// 	  .then((movie) => {
// 	    getCastFromId(movie.id)
// 			.then(genders => {
// 				let year = movie.releaseDate.split("-")[0];
// 				let dataUrl = generateCanvas(_.toPairs(genders), `${movie.title}`, year, castLimit);
// 			    let statusData = {
// 			      "castMemberCount": castLimit,
// 			      "movieTitle": movie.title,
// 			      "movieYear": year,
// 			      "breakdown": _.toPairs(genders),
// 			      "dataUrl": dataUrl.split(",")[1],
// 			      "movieId": movie.id
// 			    }
// 			    checkIfPosted(statusData);
// 		        statusData["replyTo"] = replyTo;
// 			    statusData["statusId"] = statusId;
//   			postToTwitter(statusData); // Post again to the general timeline
// 			})
// 			.catch(e => {
// 				// Tweet saying that not enough data on cast members was found.
// 				giveErrorTweet(e, statusId, replyTo);
// 			});
// 	})
// 	.catch(e => {
// 		// Tweet saying that the movie was not found.
// 		giveErrorTweet(e, statusId, replyTo);
// 	});

//   console.log(`tweet detected: ${tweetText}`);

// });

//// ANALYSIS ////

const getGenders = function(movieName) {
	getID(movieName)
			.then((movie) => {
				getCastFromId(movie.id)
					.then(genders => {
					    console.log(movieName, genders);
					})
					.catch(e => {
						// Tweet saying that not enough data on cast members was found.
						console.log(movieName, e)
					});
			})
			.catch(e => {
				// Tweet saying that the movie was not found.
				console.log(movieName, e)
			})
}

// releaseDates.forEach((release, i) => {
// 	setTimeout(o => getGenders(release[0]), i*5000);
// })

		// getID("batman begins")
		// 	.then((movie) => {
		// 		getCastFromId(movie.id)
		// 			.then(genders => {
		// 			    console.log(genders);
		// 			})
		// 			.catch(e => {
		// 				// Tweet saying that not enough data on cast members was found.
		// 				console.log("e3", e)
		// 			});
		// 	})
		// 	.catch(e => {
		// 		// Tweet saying that the movie was not found.
		// 		console.log("e2", e)
		// 	});

// Todo: 
// Figure out the 'most' female movie this year
// Figure out a way to only post a movie once on its release date
// Figure out if someone retweets if thats a problem