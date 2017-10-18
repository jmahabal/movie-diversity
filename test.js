'use strict';

var chai = require('chai');
const expect = chai.expect;

const functions = require('./functions.js');

// generateAltText

describe('generateAltText should generate some backup text', () => {
    it('should return a function', () => {
      expect(functions.generateAltText).to.be.a('function');
    });
    it('should return valid text', () => {
      const expectedText = 'Women: 12; Men: 4; Unknown: 4';
      expect(functions.generateAltText([['Women', 12], ['Men', 4], ['Unknown', 4]]) === expectedText).to.be.true;
    });
    it('should not use outdated gender language', () => {
      const unExpectedText = 'Females: 12; Males: 4; Unknown: 4';
      expect(functions.generateAltText([['Women', 12], ['Men', 4], ['Unknown', 4]]) === unExpectedText).to.be.false;
    });
});

// getID


// determineGender

describe('determineGender should sort into buckets correctly', () => {
    it('should return a function', () => {
      expect(functions.determineGender).to.be.a('function');
    });
    it('should sort returned gender into women', () => {
      expect(functions.determineGender(1) === 'Women').to.be.true;
    });
    it('should not use outdated gender language', () => {
      expect(functions.determineGender(1) === 'Female').to.be.false;
    });
    it('should sort returned gender into men', () => {
      expect(functions.determineGender(2) === 'Men').to.be.true;
    });
    it('should consider strings invalid data, even if number', () => {
	    expect(functions.determineGender('1') === 'Unknown').to.be.true;
    });
    it('should think strings are invalid', () => {
      expect(functions.determineGender('Hello') === 'Unknown').to.be.true;
    });
    it('should think empty arguments are unknown gender', () => {
      expect(functions.determineGender() === 'Unknown').to.be.true;
    });
    it('should think null arguments are unknown gender', () => {
      expect(functions.determineGender(null) === 'Unknown').to.be.true;
    });
});

// generateTweet

// const generateTweet = function generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag) {
//   let majority = _.filter(data, x => x[1] > castMemberCount/2);
//     let max = _.filter(data, y => y[1] === _.maxBy(data, x => parseInt(x[1]))[1]).map(z => z[0].toLowerCase()).sort().reverse().join(' or ').replace('unknown', 'of unknown gender');
//   let largestCohortText = _.isEmpty(majority) 
//               ? `the plurality were ${max}`
//               : `the majority were ${majority[0][0].toLowerCase()}`;
//   return `Of the ${castMemberCount} top-billed cast members in ${titleToHashtag(movieTitle)} (${movieYear}), ${largestCohortText}.\n\nhttps://www.themoviedb.org/movie/${movieId}`;
// };

describe('generateTweet should return valid tweet text', () => {
    it('should be a function', () => {
      expect(functions.generateTweet).to.be.a('function');
    });
    it('should properly convert Space Jam', () => {
      const castMemberCount = 20;
      const movieTitle = 'Space Jam';
      const movieYear = '1996';
      const data = [['Women', 1], ['Men', 9], ['Unknown', 10]];
      const movieId = '2300';
      const titleToHashtag = functions.titleToHashtag;
      const expectedText = 'Of the 20 top-billed cast members in #SpaceJam (1996), the plurality were of unknown gender.\n\nhttps://www.themoviedb.org/movie/2300';
      expect(functions.generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag) === expectedText).to.be.true;
    });
    it('should handle a majority', () => {
      const castMemberCount = 20;
      const movieTitle = 'Space Jam';
      const movieYear = '1996';
      const data = [['Women', 2], ['Men', 11], ['Unknown', 7]];
      const movieId = '2300';
      const titleToHashtag = functions.titleToHashtag;
      const expectedText = 'Of the 20 top-billed cast members in #SpaceJam (1996), the majority were men.\n\nhttps://www.themoviedb.org/movie/2300';
      expect(functions.generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag) === expectedText).to.be.true;
    });
    it('should handle ties', () => {
      const castMemberCount = 20;
      const movieTitle = 'Space Jam';
      const movieYear = '1996';
      const data = [['Women', 2], ['Men', 8], ['Unknown', 8]];
      const movieId = '2300';
      const titleToHashtag = functions.titleToHashtag;
      const expectedText = 'Of the 20 top-billed cast members in #SpaceJam (1996), the plurality were of unknown gender or men.\n\nhttps://www.themoviedb.org/movie/2300';
      expect(functions.generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag) === expectedText).to.be.true;
    });
});

// titleToHashtag

describe('titleToHashtag should convert a title into a hashtag', () => {
    it('should be a function', () => {
      expect(functions.titleToHashtag).to.be.a('function');
    });
    it('should add the hash', () => {
      expect(functions.titleToHashtag('Marshall') === '#Marshall').to.be.true;
    });
    it('should remove spaces', () => {
      expect(functions.titleToHashtag('Harry Potter') === '#HarryPotter').to.be.true;
    });
    it('should capitalize properly', () => {
      const expectedText = '#HarryPotterAndTheGobletOfFire';
      expect(functions.titleToHashtag('Harry Potter and the Goblet of Fire ') === expectedText).to.be.true;
    });
    it('should remove weird characters (numbers are fine)', () => {
      const expectedText = '#30for30';
      expect(functions.titleToHashtag('<3,.0>;?%{f}oâr~3|0`#!@$_^%$(*)"') === expectedText).to.be.true;
    });
    it('should do all of the above, combined', () => {
      const expectedText = '#ProfessorMarstonTheWonderWoman';
      expect(functions.titleToHashtag('Professor Marston & the Wonder Woman') === expectedText).to.be.true;
    });
});

// generateCanvas

