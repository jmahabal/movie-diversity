'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;
const assert = chai.assert;

const functions = require('./functions.js');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const apikey = process.env.apikey;

// generateAltText

describe('generateAltText should generate some backup text', () => {
    it('should return a function', () => {
      expect(functions.generateAltText).to.be.a('function');
    });
    it('should return valid text', () => {
      const expectedText = 'Women: 12; Men: 4; Unknown: 4';
      assert.equal(functions.generateAltText([['Women', 12], ['Men', 4], ['Unknown', 4]]), expectedText);
    });
    it('should not use outdated gender language', () => {
      const expectedText = 'Females: 12; Males: 4; Unknown: 4';
      assert.notEqual(functions.generateAltText([['Women', 12], ['Men', 4], ['Unknown', 4]]), expectedText);
    });
});

// getID

describe('getID should return the appropiate ID from a movie title', () => {
  it('should error out when given a bad string', function() {
    return assert.isRejected(functions.getID('blahblahblah', apikey));
  });
  // it('should NOT error out when given a good string', function() {
  //   return assert.isFulfilled(functions.getID('space jam', apikey));
  // });
  // it('should return the title and id for, say, blade runner 2049', function() {
  //   return functions.getID('blade runner 2049', apikey).then(data => {
  //       assert.equal(data.title, 'Blade Runner 2049');
  //       assert.equal(data.id.toString(), '335984');
  //   });
  // });
});

// determineGender

describe('determineGender should sort into buckets correctly', () => {
    it('should return a function', () => {
      expect(functions.determineGender).to.be.a('function');
    });
    it('should sort returned gender into women', () => {
      assert.equal(functions.determineGender(1), 'Women');
    });
    it('should not use outdated gender language', () => {
      assert.notEqual(functions.determineGender(1), 'Female');
    });
    it('should sort returned gender into men', () => {
      assert.equal(functions.determineGender(2), 'Men');
    });
    it('should consider strings invalid data, even if number', () => {
	    assert.equal(functions.determineGender('1'), 'Unknown');
    });
    it('should think strings are invalid', () => {
      assert.equal(functions.determineGender('Hello'), 'Unknown');
    });
    it('should think empty arguments are unknown gender', () => {
      assert.equal(functions.determineGender(), 'Unknown');
    });
    it('should think null arguments are unknown gender', () => {
      assert.equal(functions.determineGender(null), 'Unknown');
    });
});

// getCastFromId
// Note: this test may fail if the movie is updated (hence why we choose an older one)

describe('getCastFromId should return the cast distribution', () => {
  it('should error out when given a bad string', function() {
    return assert.isRejected(functions.getCastFromId('dsfgfdg', apikey));
  });
  // it('should NOT error out when given a good string', function() {
  //   return assert.isFulfilled(functions.getCastFromId('68726', apikey));
  // });
  // it('should correctly return the distribution for, say, HPGoF', function() {
  //   return functions.getCastFromId('674', apikey).then(data => {
  //       assert.equal(data.Men, 14);
  //       assert.equal(data.Women, 6);
  //   });
  // });
});

// generateTweet

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
      assert.equal(functions.generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag), expectedText);
    });
    it('should handle a majority', () => {
      const castMemberCount = 20;
      const movieTitle = 'Space Jam';
      const movieYear = '1996';
      const data = [['Women', 2], ['Men', 11], ['Unknown', 7]];
      const movieId = '2300';
      const titleToHashtag = functions.titleToHashtag;
      const expectedText = 'Of the 20 top-billed cast members in #SpaceJam (1996), the majority were men.\n\nhttps://www.themoviedb.org/movie/2300';
      assert.equal(functions.generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag), expectedText);
    });
    it('should handle ties', () => {
      const castMemberCount = 20;
      const movieTitle = 'Space Jam';
      const movieYear = '1996';
      const data = [['Women', 2], ['Men', 8], ['Unknown', 8]];
      const movieId = '2300';
      const titleToHashtag = functions.titleToHashtag;
      const expectedText = 'Of the 20 top-billed cast members in #SpaceJam (1996), the plurality were of unknown gender or men.\n\nhttps://www.themoviedb.org/movie/2300';
      assert.equal(functions.generateTweet(castMemberCount, movieTitle, movieYear, data, movieId, titleToHashtag), expectedText);
    });
});

// titleToHashtag

describe('titleToHashtag should convert a title into a hashtag', () => {
    it('should be a function', () => {
      expect(functions.titleToHashtag).to.be.a('function');
    });
    it('should add the hash', () => {
      assert.equal(functions.titleToHashtag('Marshall'), '#Marshall');
    });
    it('should remove spaces', () => {
      assert.equal(functions.titleToHashtag('Harry Potter'), '#HarryPotter');
    });
    it('should capitalize properly', () => {
      const expectedText = '#HarryPotterAndTheGobletOfFire';
      assert.equal(functions.titleToHashtag('Harry Potter and the Goblet of Fire '), expectedText);
    });
    it('should remove weird characters (numbers are fine)', () => {
      const expectedText = '#30for30';
      assert.equal(functions.titleToHashtag('<3,.0>;?%{f}oâr~3|0`#!@$_^%$(*)"'), expectedText);
    });
    it('should do all of the above, combined', () => {
      const expectedText = '#ProfessorMarstonTheWonderWoman';
      assert.equal(functions.titleToHashtag('Professor Marston & the Wonder Woman'), expectedText);
    });
});

// generateCanvas

