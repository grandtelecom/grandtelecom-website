// Jest setup: expose browser-like globals and project utilities

// Create a minimal DOM environment using jsdom when running in Node
if (typeof window === 'undefined' || typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously'
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.Blob = dom.window.Blob;
}

// Ensure CONFIG is available first
global.CONFIG = require('../js/config.js');

// Expose utilities to global scope as tests use them without imports
global.ValidationUtils = require('../js/validation.js');
global.ImageUtils = require('../js/imageUtils.js');

// Provide a File shim if missing
if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    constructor(chunks, filename, options = {}) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = options.lastModified || Date.now();
      this.type = options.type || '';
    }
  };
}
