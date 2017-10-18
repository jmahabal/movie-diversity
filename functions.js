'use strict';

var rpn = require('request-promise-native'); 
var _ = require('lodash'); 
var d3 = require('d3');
var sharp = require('sharp');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const castLimit = 20;

// Get ID of a Movie given it's title
// Return a promise
const getID = function(movieTitle, apikey) {
	return new Promise((resolve, reject) => {
		let baseUrl = 'https://api.themoviedb.org/3/search/movie?api_key=' + apikey + '&query=';
		rpn.get(baseUrl+movieTitle.split(' ').join('+'))
		  .then(response => {
            console.log('Response from TMDB', response);
		  	let movie = JSON.parse(response).results[0];
		  	resolve({id: movie.id, title: movie.title, releaseDate: movie.release_date});
		  })
		  .catch(() => {
		  	reject(`I could not find film information for "${movieTitle}".`);
		  });
	});
};

// Given a cast member, get gender
// Using the API specs
const determineGender = function(gender) {
	if (gender === 1) {
		return 'Women';
	} else if (gender === 2) {
		return 'Men';
	} 
	return 'Unknown';
};

// Given a movie title, return it's cast members
// If the movie doesn't have many people, we exclude it from our analysis
// We keep only the top 20 billed people
// But should this value expand to the entire cast (like if there are 50 folks, why not?)
const getCastFromId = function(movieId, apikey) {
	return new Promise((resolve, reject) => {
		let baseUrl = 'https://api.themoviedb.org/3/movie/' + movieId + '?append_to_response=credits&api_key=' + apikey;
		rpn.get(baseUrl)
		  .then(response => {
		  	if (JSON.parse(response).credits.cast.length > 19) {
			  	resolve(_.countBy(JSON.parse(response).credits.cast.splice(0, castLimit).map(x => determineGender(x.gender))));
		  	}
	  		reject(`I could not gather enough information on the cast members of this film.`);
		  });
	});
};

const titleToHashtag = function titleToHashtag(title) {
   return '#' + title.split(' ').map(t => t.replace(/[^a-z0-9]/gi, '')).map(t => t && t[0].toUpperCase() + t.slice(1)).join('');
};

// To generate a gender bar graph we'll use D3
// We need an object in the form:
// data is of the form [['Female', 6], ['Male', 6], ['Unknown', 6]]

const generateCanvas = function generateCanvas(data, title, year, castMemberCount) {

    const width = 320; // Need a 2:1 ratio
    const height = 160;
    const margin = {top: 40, bottom: 40, right: 40, left: 85};

    let Canvas = require('canvas-prebuilt');
    let canvas = new Canvas(width + margin.left + margin.right, height + margin.top + margin.bottom);
    let ctx = canvas.getContext('2d');
    // ctx.scale(2, 2);

    // ctx.fillStyle = "rgba(250,239,209,1)";
    ctx.fillStyle = 'white';

    ctx.fillRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
    ctx.fillStyle = 'black';

    ctx.translate(margin.left + 0.5, margin.top + 0.5);

    let xScale = d3.scaleLinear().domain([0, castMemberCount]).range([0, width]);
    let yScale = d3.scaleBand().domain(['Women', 'Men', 'Unknown']).range([0, height]).paddingOuter(0.3).paddingInner(0.3);

    let xTickCount = 5;
    let xTicks = xScale.ticks(xTickCount);

    ctx.beginPath();
    xTicks.forEach(function(d) {
      ctx.moveTo(xScale(d), height);
      ctx.lineTo(xScale(d), height + 6);
    });
    ctx.strokeStyle = 'black';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '10px Arial';
    xTicks.forEach(function(d) {
      ctx.fillText(d, xScale(d), height + 8);
    });

    ctx.beginPath();

    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';

    yScale.domain().forEach(function(d) {
      ctx.fillText(d, -12 + 0.5, yScale(d) + yScale.bandwidth() / 2  + 0.5);
    });

    // For filling in the line across the x axis
    ctx.beginPath();
    ctx.moveTo(0, height + 0.5);
    ctx.lineTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, height + 0.5);
    ctx.strokeStyle = 'black';
    ctx.stroke();

    // Text
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = '10px Arial';
    ctx.fillText(`Top ${castMemberCount} Billed Cast Members`, width, height - 4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '16px Arial';
    ctx.fillText(`${title} (${year})`, width/2, -6);

    ctx.restore();

    // ctx.fillStyle = "rgb(116,160,137)";
    ctx.fillStyle = 'rgb(180,15,32)';

    data.forEach(function(d) {
      ctx.fillRect(0.5, yScale(d[0]) + 0.5, xScale(d[1]), yScale.bandwidth());
    });

    // canvas.toDataURL('image/jpeg', 1, function(err, jpeg){ 
    //   console.log(jpeg);
    // })

    return canvas.toDataURL();
};

const generateTweet = function generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag) {
	let majority = _.filter(data, x => x[1] > castMemberCount/2);
    let max = _.filter(data, y => y[1] === _.maxBy(data, x => parseInt(x[1]))[1]).map(z => z[0].toLowerCase()).sort().reverse().join(' or ').replace('unknown', 'of unknown gender');
	let largestCohortText = _.isEmpty(majority) 
						  ? `the plurality were ${max}`
						  : `the majority were ${majority[0][0].toLowerCase()}`;
	return `Of the ${castMemberCount} top-billed cast members in ${titleToHashtag(movieTitle)} (${movieYear}), ${largestCohortText}.\n\nhttps://www.themoviedb.org/movie/${movieId}`;
};

const generateAltText = function generateAltText(pairedData) {
	return pairedData.map(x => `${x[0]}: ${x[1]}`).join('; ');
};

module.exports = {
  generateAltText,
  getID,
  determineGender,
  getCastFromId,
  generateTweet,
  titleToHashtag,
  generateCanvas
};
