'use strict';

const expect = require('chai').expect;
const tweeter = require('./index.js');

describe('User module', () => {
    it('should export a function', () => {
      expect(tweeter.generateAltText).to.be.a('function');
    });
});