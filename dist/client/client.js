'use strict';

var require$$0 = require('events');
require('@vite/env');

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var constants$1 = {
  // Alphabet chars.
  CHAR_UPPERCASE_A: 65, /* A */
  CHAR_LOWERCASE_A: 97, /* a */
  CHAR_UPPERCASE_Z: 90, /* Z */
  CHAR_LOWERCASE_Z: 122, /* z */

  // Non-alphabetic chars.
  CHAR_DOT: 46, /* . */
  CHAR_FORWARD_SLASH: 47, /* / */
  CHAR_BACKWARD_SLASH: 92, /* \ */
  CHAR_VERTICAL_LINE: 124, /* | */
  CHAR_COLON: 58, /* : */
  CHAR_QUESTION_MARK: 63, /* ? */
  CHAR_UNDERSCORE: 95, /* _ */
  CHAR_LINE_FEED: 10, /* \n */
  CHAR_CARRIAGE_RETURN: 13, /* \r */
  CHAR_TAB: 9, /* \t */
  CHAR_FORM_FEED: 12, /* \f */
  CHAR_EXCLAMATION_MARK: 33, /* ! */
  CHAR_HASH: 35, /* # */
  CHAR_SPACE: 32, /*   */
  CHAR_NO_BREAK_SPACE: 160, /* \u00A0 */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, /* \uFEFF */
  CHAR_LEFT_SQUARE_BRACKET: 91, /* [ */
  CHAR_RIGHT_SQUARE_BRACKET: 93, /* ] */
  CHAR_LEFT_ANGLE_BRACKET: 60, /* < */
  CHAR_RIGHT_ANGLE_BRACKET: 62, /* > */
  CHAR_LEFT_CURLY_BRACKET: 123, /* { */
  CHAR_RIGHT_CURLY_BRACKET: 125, /* } */
  CHAR_HYPHEN_MINUS: 45, /* - */
  CHAR_PLUS: 43, /* + */
  CHAR_DOUBLE_QUOTE: 34, /* " */
  CHAR_SINGLE_QUOTE: 39, /* ' */
  CHAR_PERCENT: 37, /* % */
  CHAR_SEMICOLON: 59, /* ; */
  CHAR_CIRCUMFLEX_ACCENT: 94, /* ^ */
  CHAR_GRAVE_ACCENT: 96, /* ` */
  CHAR_AT: 64, /* @ */
  CHAR_AMPERSAND: 38, /* & */
  CHAR_EQUAL: 61, /* = */

  // Digits
  CHAR_0: 48, /* 0 */
  CHAR_9: 57, /* 9 */

  EOL: '\n'
};

const hexTable$1 = new Array(256);
for (var i = 0; i < 256; ++i) {
  hexTable$1[i] = '%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase();
}

const isHexTable = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 64 - 79
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 80 - 95
  0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 96 - 111
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 112 - 127
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 128 ...
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0  // ... 256
];

function encodeStr$1(str, noEscapeTable, hexTable) {
  const len = str.length;
  if (len === 0) {
    return '';
  }

  var out = '';
  var lastPos = 0;

  for (var i = 0; i < len; i++) {
    var c = str.charCodeAt(i);

    // ASCII
    if (c < 0x80) {
      if (noEscapeTable[c] === 1) {
        continue;
      }
      if (lastPos < i) {
        out += str.slice(lastPos, i);
      }
      lastPos = i + 1;
      out += hexTable[c];
      continue;
    }

    if (lastPos < i) {
      out += str.slice(lastPos, i);
    }

    // Multi-byte characters ...
    if (c < 0x800) {
      lastPos = i + 1;
      out += hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)];
      continue;
    }
    if (c < 0xD800 || c >= 0xE000) {
      lastPos = i + 1;
      out += hexTable[0xE0 | (c >> 12)]
        + hexTable[0x80 | ((c >> 6) & 0x3F)]
        + hexTable[0x80 | (c & 0x3F)];
      continue;
    }
    // Surrogate pair
    ++i;

    // This branch should never happen because all URLSearchParams entries
    // should already be converted to USVString. But, included for
    // completion's sake anyway.
    if (i >= len) {
      throw new Error('URI malformed');
    }

    var c2 = str.charCodeAt(i) & 0x3FF;

    lastPos = i + 1;
    c = 0x10000 + (((c & 0x3FF) << 10) | c2);
    out += hexTable[0xF0 | (c >> 18)]
      + hexTable[0x80 | ((c >> 12) & 0x3F)]
      + hexTable[0x80 | ((c >> 6) & 0x3F)]
      + hexTable[0x80 | (c & 0x3F)];
  }
  if (lastPos === 0) {
    return str;
  }
  if (lastPos < len) {
    return out + str.slice(lastPos);
  }
  return out;
}

var querystring$1 = {
  encodeStr: encodeStr$1,
  hexTable: hexTable$1,
  isHexTable
};

const {
  CHAR_SPACE,
  CHAR_TAB,
  CHAR_CARRIAGE_RETURN,
  CHAR_LINE_FEED,
  CHAR_FORM_FEED,
  CHAR_NO_BREAK_SPACE,
  CHAR_ZERO_WIDTH_NOBREAK_SPACE,
  CHAR_HASH,
  CHAR_FORWARD_SLASH,
  CHAR_LEFT_SQUARE_BRACKET,
  CHAR_RIGHT_SQUARE_BRACKET,
  CHAR_LEFT_ANGLE_BRACKET,
  CHAR_RIGHT_ANGLE_BRACKET,
  CHAR_LEFT_CURLY_BRACKET,
  CHAR_RIGHT_CURLY_BRACKET,
  CHAR_QUESTION_MARK,
  CHAR_LOWERCASE_A,
  CHAR_LOWERCASE_Z,
  CHAR_UPPERCASE_A,
  CHAR_UPPERCASE_Z,
  CHAR_DOT,
  CHAR_0,
  CHAR_9,
  CHAR_HYPHEN_MINUS,
  CHAR_PLUS,
  CHAR_UNDERSCORE,
  CHAR_DOUBLE_QUOTE,
  CHAR_SINGLE_QUOTE,
  CHAR_PERCENT,
  CHAR_SEMICOLON,
  CHAR_BACKWARD_SLASH,
  CHAR_CIRCUMFLEX_ACCENT,
  CHAR_GRAVE_ACCENT,
  CHAR_VERTICAL_LINE,
  CHAR_AT,
} = constants$1;
const { encodeStr, hexTable } = querystring$1;

/*
// WHATWG URL implementation provided by internal/url
const {
  URL,
  URLSearchParams,
  domainToASCII,
  domainToUnicode,
  formatSymbol,
  pathToFileURL,
  fileURLToPath
} = require('internal/url');
*/

// Original url.parse() APIs

function Url$1() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// define these here so at least they only have to be
// compiled once on the first module load.
const protocolPattern = /^[a-z0-9.+-]+:/i;
const portPattern = /:[0-9]*$/;
const hostPattern = /^\/\/[^@/]+@[^@/]+/;

// Special case for a simple path URL
const simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/;

const hostnameMaxLen = 255;

// Protocols that can allow "unsafe" and "unwise" chars.
const unsafeProtocol = new Set([
  'javascript',
  // eslint-disable-next-line no-script-url
  'javascript:'
]);
// Protocols that never have a hostname.
const hostlessProtocol = new Set([
  'javascript',
  // eslint-disable-next-line no-script-url
  'javascript:'
]);
// Protocols that always contain a // bit.
const slashedProtocol = new Set([
  'http',
  'http:',
  'https',
  'https:',
  'ftp',
  'ftp:',
  'gopher',
  'gopher:',
  'file',
  'file:',
  'ws',
  'ws:',
  'wss',
  'wss:'
]);

// Lazy loaded for startup performance.
let querystring;

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url instanceof Url$1) {
    return url;
  }

  const urlObject = new Url$1();
  urlObject.parse(url, parseQueryString, slashesDenoteHost);
  return urlObject;
}

Url$1.prototype.parse = function parse(url, parseQueryString, slashesDenoteHost) {
  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var hasHash = false;
  var start = -1;
  var end = -1;
  var rest = '';
  var lastPos = 0;
  var i = 0;
  for (var inWs = false, split = false; i < url.length; ++i) {
    const code = url.charCodeAt(i);

    // Find first and last non-whitespace characters for trimming
    const isWs = code === CHAR_SPACE
      || code === CHAR_TAB
      || code === CHAR_CARRIAGE_RETURN
      || code === CHAR_LINE_FEED
      || code === CHAR_FORM_FEED
      || code === CHAR_NO_BREAK_SPACE
      || code === CHAR_ZERO_WIDTH_NOBREAK_SPACE;
    if (start === -1) {
      if (isWs) {
        continue;
      }
      lastPos = start = i;
    } else if (inWs) {
      if (!isWs) {
        end = -1;
        inWs = false;
      }
    } else if (isWs) {
      end = i;
      inWs = true;
    }

    // Only convert backslashes while we haven't seen a split character
    if (!split) {
      switch (code) {
        case CHAR_HASH:
          hasHash = true;
          // Fall through
        case CHAR_QUESTION_MARK:
          split = true;
          break;
        case CHAR_BACKWARD_SLASH:
          if (i - lastPos > 0) {
            rest += url.slice(lastPos, i);
          }
          rest += '/';
          lastPos = i + 1;
          break;
      }
    } else if (!hasHash && code === CHAR_HASH) {
      hasHash = true;
    }
  }

  // Check if string was non-empty (including strings with only whitespace)
  if (start !== -1) {
    if (lastPos === start) {
      // We didn't convert any backslashes

      if (end === -1) {
        if (start === 0) {
          rest = url;
        } else {
          rest = url.slice(start);
        }
      } else {
        rest = url.slice(start, end);
      }
    } else if (end === -1 && lastPos < url.length) {
      // We converted some backslashes and have only part of the entire string
      rest += url.slice(lastPos);
    } else if (end !== -1 && lastPos < end) {
      // We converted some backslashes and have only part of the entire string
      rest += url.slice(lastPos, end);
    }
  }

  if (!slashesDenoteHost && !hasHash) {
    // Try fast path regexp
    const simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          if (querystring === undefined) {
            querystring = querystring$1;
          }
          this.query = querystring.parse(this.search.slice(1));
        } else {
          this.query = this.search.slice(1);
        }
      } else if (parseQueryString) {
        this.search = null;
        this.query = Object.create(null);
      }
      return this;
    }
  }

  let proto = protocolPattern.exec(rest);
  let lowerProto;
  if (proto) {
    proto = proto[0];
    lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.slice(proto.length);
  }

  // Figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  let slashes;
  if (slashesDenoteHost || proto || hostPattern.test(rest)) {
    slashes = rest.charCodeAt(0) === CHAR_FORWARD_SLASH
      && rest.charCodeAt(1) === CHAR_FORWARD_SLASH;
    if (slashes && !(proto && hostlessProtocol.has(lowerProto))) {
      rest = rest.slice(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol.has(lowerProto)
    && (slashes || (proto && !slashedProtocol.has(proto)))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:b path:/?@c

    var hostEnd = -1;
    var atSign = -1;
    var nonHost = -1;
    for (i = 0; i < rest.length; ++i) {
      switch (rest.charCodeAt(i)) {
        case CHAR_TAB:
        case CHAR_LINE_FEED:
        case CHAR_CARRIAGE_RETURN:
        case CHAR_SPACE:
        case CHAR_DOUBLE_QUOTE:
        case CHAR_PERCENT:
        case CHAR_SINGLE_QUOTE:
        case CHAR_SEMICOLON:
        case CHAR_LEFT_ANGLE_BRACKET:
        case CHAR_RIGHT_ANGLE_BRACKET:
        case CHAR_BACKWARD_SLASH:
        case CHAR_CIRCUMFLEX_ACCENT:
        case CHAR_GRAVE_ACCENT:
        case CHAR_LEFT_CURLY_BRACKET:
        case CHAR_VERTICAL_LINE:
        case CHAR_RIGHT_CURLY_BRACKET:
          // Characters that are never ever allowed in a hostname from RFC 2396
          if (nonHost === -1) {
            nonHost = i;
          }
          break;
        case CHAR_HASH:
        case CHAR_FORWARD_SLASH:
        case CHAR_QUESTION_MARK:
          // Find the first instance of any host-ending characters
          if (nonHost === -1) {
            nonHost = i;
          }
          hostEnd = i;
          break;
        case CHAR_AT:
          // At this point, either we have an explicit point where the
          // auth portion cannot go past, or the last @ char is the decider.
          atSign = i;
          nonHost = -1;
          break;
      }
      if (hostEnd !== -1) {
        break;
      }
    }
    start = 0;
    if (atSign !== -1) {
      this.auth = decodeURIComponent(rest.slice(0, atSign));
      start = atSign + 1;
    }
    if (nonHost === -1) {
      this.host = rest.slice(start);
      rest = '';
    } else {
      this.host = rest.slice(start, nonHost);
      rest = rest.slice(nonHost);
    }

    // pull out port.
    this.parseHost();

    // We've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    if (typeof this.hostname !== 'string') {
      this.hostname = '';
    }

    var hostname = this.hostname;

    // If hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = hostname.charCodeAt(0) === CHAR_LEFT_SQUARE_BRACKET
      && hostname.charCodeAt(hostname.length - 1) === CHAR_RIGHT_SQUARE_BRACKET;

    // validate a little.
    if (!ipv6Hostname) {
      rest = getHostname(this, rest, hostname);
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // Hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.slice(1, -1);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // Now rest is set to the post-host stuff.
  // Chop off any delim chars.
  if (!unsafeProtocol.has(lowerProto)) {
    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    rest = autoEscapeStr(rest);
  }

  var questionIdx = -1;
  var hashIdx = -1;
  for (i = 0; i < rest.length; ++i) {
    const code = rest.charCodeAt(i);
    if (code === CHAR_HASH) {
      this.hash = rest.slice(i);
      hashIdx = i;
      break;
    } else if (code === CHAR_QUESTION_MARK && questionIdx === -1) {
      questionIdx = i;
    }
  }

  if (questionIdx !== -1) {
    if (hashIdx === -1) {
      this.search = rest.slice(questionIdx);
      this.query = rest.slice(questionIdx + 1);
    } else {
      this.search = rest.slice(questionIdx, hashIdx);
      this.query = rest.slice(questionIdx + 1, hashIdx);
    }
    if (parseQueryString) {
      if (querystring === undefined) {
        querystring = querystring$1;
      }
      this.query = querystring.parse(this.query);
    }
  } else if (parseQueryString) {
    // No query string, but parseQueryString still requested
    this.search = null;
    this.query = Object.create(null);
  }

  const useQuestionIdx
    = questionIdx !== -1 && (hashIdx === -1 || questionIdx < hashIdx);
  const firstIdx = useQuestionIdx ? questionIdx : hashIdx;
  if (firstIdx === -1) {
    if (rest.length > 0) {
      this.pathname = rest;
    }
  } else if (firstIdx > 0) {
    this.pathname = rest.slice(0, firstIdx);
  }
  if (slashedProtocol.has(lowerProto)
    && this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  // To support http.request
  if (this.pathname || this.search) {
    const p = this.pathname || '';
    const s = this.search || '';
    this.path = p + s;
  }

  // Finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

function getHostname(self, rest, hostname) {
  for (var i = 0; i < hostname.length; ++i) {
    const code = hostname.charCodeAt(i);
    const isValid = (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z)
                    || code === CHAR_DOT
                    || (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z)
                    || (code >= CHAR_0 && code <= CHAR_9)
                    || code === CHAR_HYPHEN_MINUS
                    || code === CHAR_PLUS
                    || code === CHAR_UNDERSCORE
                    || code > 127;

    // Invalid host character
    if (!isValid) {
      self.hostname = hostname.slice(0, i);
      return `/${hostname.slice(i)}${rest}`;
    }
  }
  return rest;
}

// Escaped characters. Use empty strings to fill up unused entries.
// Using Array is faster than Object/Map
const escapedCodes = [
  /* 0 - 9 */ '', '', '', '', '', '', '', '', '', '%09',
  /* 10 - 19 */ '%0A', '', '', '%0D', '', '', '', '', '', '',
  /* 20 - 29 */ '', '', '', '', '', '', '', '', '', '',
  /* 30 - 39 */ '', '', '%20', '', '%22', '', '', '', '', '%27',
  /* 40 - 49 */ '', '', '', '', '', '', '', '', '', '',
  /* 50 - 59 */ '', '', '', '', '', '', '', '', '', '',
  /* 60 - 69 */ '%3C', '', '%3E', '', '', '', '', '', '', '',
  /* 70 - 79 */ '', '', '', '', '', '', '', '', '', '',
  /* 80 - 89 */ '', '', '', '', '', '', '', '', '', '',
  /* 90 - 99 */ '', '', '%5C', '', '%5E', '', '%60', '', '', '',
  /* 100 - 109 */ '', '', '', '', '', '', '', '', '', '',
  /* 110 - 119 */ '', '', '', '', '', '', '', '', '', '',
  /* 120 - 125 */ '', '', '', '%7B', '%7C', '%7D'
];

// Automatically escape all delimiters and unwise characters from RFC 2396.
// Also escape single quotes in case of an XSS attack.
// Return the escaped string.
function autoEscapeStr(rest) {
  var escaped = '';
  var lastEscapedPos = 0;
  for (var i = 0; i < rest.length; ++i) {
    // `escaped` contains substring up to the last escaped character.
    var escapedChar = escapedCodes[rest.charCodeAt(i)];
    if (escapedChar) {
      // Concat if there are ordinary characters in the middle.
      if (i > lastEscapedPos) {
        escaped += rest.slice(lastEscapedPos, i);
      }
      escaped += escapedChar;
      lastEscapedPos = i + 1;
    }
  }
  if (lastEscapedPos === 0) { // Nothing has been escaped.
    return rest;
  }

  // There are ordinary characters at the end.
  if (lastEscapedPos < rest.length) {
    escaped += rest.slice(lastEscapedPos);
  }

  return escaped;
}

// Format a parsed object into a url string
function urlFormat(urlObject, options) {
  // Ensure it's an object, and not a string url.
  // If it's an object, this is a no-op.
  // this way, you can call urlParse() on strings
  // to clean up potentially wonky urls.
  if (typeof urlObject === 'string') {
    urlObject = urlParse(urlObject);
  } else if (typeof urlObject !== 'object' || urlObject === null) {
    throw new Error(`urlObject must be of type ${[ 'Object', 'string' ].join(', ')} but was ${typeof urlObject}`);
  } else if (!(urlObject instanceof Url$1)) {
    return Url$1.prototype.format.call(urlObject);
  }
  return urlObject.format();
}

// These characters do not need escaping:
// ! - . _ ~
// ' ( ) * :
// digits
// alpha (uppercase)
// alpha (lowercase)
const noEscapeAuth = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0x00 - 0x0F
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0x10 - 0x1F
  0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, // 0x20 - 0x2F
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, // 0x30 - 0x3F
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 0x40 - 0x4F
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, // 0x50 - 0x5F
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 0x60 - 0x6F
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0  // 0x70 - 0x7F
];

Url$1.prototype.format = function format() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeStr(auth, noEscapeAuth, hexTable);
    auth += '@';
  }

  var protocol = this.protocol || '';
  var pathname = this.pathname || '';
  var hash = this.hash || '';
  var host = '';
  var query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (
      this.hostname.includes(':')
        ? '[' + this.hostname + ']'
        : this.hostname
    );
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query !== null && typeof this.query === 'object') {
    if (querystring === undefined) {
      querystring = querystring$1;
    }
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.charCodeAt(protocol.length - 1) !== 58/* : */) {
    protocol += ':';
  }

  var newPathname = '';
  var lastPos = 0;
  for (var i = 0; i < pathname.length; ++i) {
    switch (pathname.charCodeAt(i)) {
      case CHAR_HASH:
        if (i - lastPos > 0) {
          newPathname += pathname.slice(lastPos, i);
        }
        newPathname += '%23';
        lastPos = i + 1;
        break;
      case CHAR_QUESTION_MARK:
        if (i - lastPos > 0) {
          newPathname += pathname.slice(lastPos, i);
        }
        newPathname += '%3F';
        lastPos = i + 1;
        break;
    }
  }
  if (lastPos > 0) {
    if (lastPos !== pathname.length) {
      pathname = newPathname + pathname.slice(lastPos);
    } else {
      pathname = newPathname;
    }
  }

  // Only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes || slashedProtocol.has(protocol)) {
    if (this.slashes || host) {
      if (pathname && pathname.charCodeAt(0) !== CHAR_FORWARD_SLASH) {
        pathname = '/' + pathname;
      }
      host = '//' + host;
    } else if (protocol.length >= 4
        && protocol.charCodeAt(0) === 102
        &&/* f */ protocol.charCodeAt(1) === 105
        &&/* i */ protocol.charCodeAt(2) === 108
        &&/* l */ protocol.charCodeAt(3) === 101/* e */) {
      host = '//';
    }
  }

  search = search.replace(/#/g, '%23');

  if (hash && hash.charCodeAt(0) !== CHAR_HASH) {
    hash = '#' + hash;
  }
  if (search && search.charCodeAt(0) !== CHAR_QUESTION_MARK) {
    search = '?' + search;
  }

  return protocol + host + pathname + search + hash;
};

Url$1.prototype.parseHost = function parseHost() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.slice(1);
    }
    host = host.slice(0, host.length - port.length);
  }
  if (host) {
    this.hostname = host;
  }
};

var url$1 = {
  // Original API
  Url: Url$1,
  parse: urlParse,
  format: urlFormat

  // WHATWG API
  /*
  URL,
  URLSearchParams,
  domainToASCII,
  domainToUnicode,
  */
};

var constants = {
  OpcodeContinueFrame: 0x0,
  OpcodeTextFrame: 0x1,
  OpcodeBinaryFrame: 0x2,
  OpcodeConnectionClose: 0x8,
  OpcodePing: 0x9,
  OpcodePong: 0xA,

  FinMask: 0x80,
  OpcodeMask: 0x0F,
  MaskMask: 0x80,
  PayloadLengthMask: 0x7F,

  EMPTY_BUFFER: Buffer.alloc(0),
  NOOP: () => {}
};

function randomBytes$1(length) {
  if (Ti.Utils.randomBytes) {
    return Buffer.from(Ti.Utils.randomBytes(length));
  } else {
    const randomBytes = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * Math.floor(255));
    }
    return randomBytes;
  }
}

function randomFillSync$1(target, offset, length) {
  const bytes = randomBytes$1(length);
  bytes.copy(target, offset, 0, length);
}

function applyMask$1(source, mask, output, offset, length) {
  for (let i = 0; i < length; i++) {
    output[offset + i] = source[i] ^ mask[i & 3];
  }
}

function toBuffer$1(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  let buf;

  if (data instanceof ArrayBuffer) {
    buf = Buffer.from(data);
  } else if (ArrayBuffer.isView(data)) {
    buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  } else {
    buf = Buffer.from(data);
  }

  return buf;
}

var utils = {
  randomBytes: randomBytes$1,
  randomFillSync: randomFillSync$1,
  applyMask: applyMask$1,
  toBuffer: toBuffer$1
};

const {
  OpcodeBinaryFrame: OpcodeBinaryFrame$1,
  OpcodeConnectionClose: OpcodeConnectionClose$1,
  OpcodeContinueFrame: OpcodeContinueFrame$1,
  OpcodePong,
  OpcodeTextFrame: OpcodeTextFrame$1
} = constants;
const { randomFillSync, applyMask, toBuffer } = utils;

const mask = Buffer.alloc(4);

let Sender$1 = class Sender {
  constructor(socket) {
    this.socket = socket;
    this.firstFragment = true;
  }

  send(data, options, cb) {
    let opcode = options.binary ? OpcodeBinaryFrame$1 : OpcodeTextFrame$1;
    let rsv1 = options.compress;

    if (this.firstFragment) {
      this.firstFragment = false;
      // @todo support perMessageDeflate
    } else {
      rsv1 = false;
      opcode = OpcodeContinueFrame$1;
    }

    if (options.fin) {
      this.firstFragment = true;
    }

    this.sendFrame(this.createFrameBuffer({
      data,
      opcode,
      fin: options.fin,
      rsv1
    }), cb);
  }

  pong(data, cb) {
    const buffer = Buffer.from(data);
    this.sendFrame(this.createFrameBuffer({
      data: buffer,
      opcode: OpcodePong,
      fin: true,
      rsv1: false
    }), cb);
  }

  close(code, reason, cb) {
    let data;
    if (code === undefined) {
      data = Buffer.allocUnsafe(0);
    } else if (typeof code !== 'number') {
      throw new TypeError('Closing code must be a valid error code number');
    } else if (reason === undefined || reason === '') {
      data = Buffer.allocUnsafe(2);
      data.writeUInt16BE(code, 0);
    } else {
      data = Buffer.allocUnsafe(2 + Buffer.byteLength(reason));
      data.writeUInt16BE(code, 0);
      data.write(reason, 2);
    }

    this.sendFrame(this.createFrameBuffer({
      data,
      opcode: OpcodeConnectionClose$1,
      fin: true,
      rsv1: false
    }), cb);
  }

  sendFrame(frame, cb) {
    this.socket.write(frame.toTiBuffer(), 0, frame.length, () => {
      if (cb) {
        cb();
      }
    });
  }

  /**
   * Creates a buffer containing the framed data
   *
   * @param {Object} options Options for the frame
   * @param {Buffer} options.data The data to frame
   * @param {Number} options.opcode Frame opcode
   * @param {Boolean} options.fin Specifies whether or not to set the FIN bit
   * @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
   * @return {Buffer}
   */
  createFrameBuffer(options) {
    const data = toBuffer(options.data);
    let offset = 6;
    let payloadLength = data.length;

    if (data.length >= 65536) {
      offset += 8;
      payloadLength = 127;
    } else if (data.length > 125) {
      offset += 2;
      payloadLength = 126;
    }

    const target = Buffer.allocUnsafe(offset);

    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
    if (options.rsv1) {
      target[0] |= 0x40;
    }

    target[1] = payloadLength;

    if (payloadLength === 126) {
      target.writeUInt16BE(data.length, 2);
    } else if (payloadLength === 127) {
      target.writeUInt32BE(0, 2);
      target.writeUInt32BE(data.length, 6);
    }

    randomFillSync(mask, 0, 4);

    target[1] |= 0x80;
    target[offset - 4] = mask[0];
    target[offset - 3] = mask[1];
    target[offset - 2] = mask[2];
    target[offset - 1] = mask[3];

    applyMask(data, mask, data, 0, data.length);

    return Buffer.concat([ target, data ]);
  }
};

var sender = Sender$1;

/**
 * Minimal WebSocket implementation using Ti.Network.Socket.TCP.
 *
 * Heavily inspired by Starscream (https://github.com/daltoniam/Starscream/)
 * and ws (https://github.com/websockets/ws)
 */

const EventEmiter = require$$0;

const url = url$1;
const {
  FinMask,
  MaskMask,
  OpcodeBinaryFrame,
  OpcodeConnectionClose,
  OpcodeContinueFrame,
  OpcodeMask,
  OpcodePing,
  OpcodeTextFrame,
  PayloadLengthMask,
  EMPTY_BUFFER,
  NOOP
} = constants;
const Sender = sender;
const { randomBytes } = utils;

const Url = url.Url;
const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
const protocolVersions = [ 8, 13 ];
const CloseCode = {
  protocolError: 1002,
  noStatus: 1005,
  abnormal: 1006
};

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class WebSocketResponse {
  constructor() {
    this.isFin = false;
    this.opcode = OpcodeContinueFrame;
    this.bytesLeft = 0;
    this.frameCount = 0;
    this.buffer = null;
  }
}

class ResponseStack {
  constructor() {
    this.stack = [];
  }

  get length() {
    return this.stack.length;
  }

  get last() {
    if (this.length > 0) {
      return this.stack[this.length - 1];
    }

    return null;
  }

  push(response) {
    this.stack.push(response);
  }

  pop() {
    return this.stack.pop();
  }
}

let WebSocket$2 = class WebSocket extends EventEmiter {
  /**
   * Creates a new WebSocket
   *
   * @param {String} address The URL to which to connect
   * @param {String|String[]} protocols The subprotocols
   * @param {Object} options Connection options
   */
  constructor(address, protocols, options) {
    super();

    this.responseStack = new ResponseStack();
    this.readyState = WebSocket.CONNECTING;
    this.socket = null;
    this.isServer = false;
    this.closeFrameSent = false;
    this.closeFrameReceived = false;

    if (Array.isArray(protocols)) {
      protocols = protocols.join(', ');
    } else if (typeof protocols === 'object' && protocols !== null) {
      options = protocols;
      protocols = undefined;
    }
    this.connect(address, protocols, options);
  }

  static get CONNECTING() {
    return 0;
  }

  static get OPEN() {
    return 1;
  }

  static get CLOSING() {
    return 2;
  }

  static get CLOSED() {
    return 3;
  }

  connect(address, protocols, options) {
    const opts = {
      protocolVersion: protocolVersions[1],
      maxPayload: 100 * 1024 * 1024,
      perMessageDeflate: true,
      followRedirects: false,
      maxRedirects: 10,
      ...options,
      createConnection: undefined,
      socketPath: undefined,
      hostname: undefined,
      protocol: undefined,
      timeout: undefined,
      method: undefined,
      auth: undefined,
      host: undefined,
      path: undefined,
      port: undefined
    };

    let parsedUrl;

    if (address instanceof Url) {
      parsedUrl = address;
      this.url = address.href;
    } else {
      parsedUrl = url.parse(address);
      this.url = address;
    }

    const isUnixSocket = parsedUrl.protocol === 'ws+unix:';
    if ((!parsedUrl.host && !parsedUrl.pathname) || isUnixSocket) {
      throw new Error(`Invalid URL: ${this.url}`);
    }

    const isSecure = parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'https:';
    const defaultPort = isSecure ? 443 : 80;
    this.secWebSocketKey = this.generateSecWebSocketKey();

    opts.defaultPort = opts.defaultPort || defaultPort;
    opts.port = parsedUrl.port || defaultPort;
    opts.host = parsedUrl.hostname.startsWith('[')
      ? parsedUrl.hostname.slice(1, -1)
      : parsedUrl.hostname;
    opts.headers = {
      'Sec-WebSocket-Version': opts.protocolVersion,
      'Sec-WebSocket-Key': this.secWebSocketKey,
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      ...opts.headers
    };
    opts.path = parsedUrl.pathname + (parsedUrl.search || '');
    opts.timeout = opts.handshakeTimeout;

    if (opts.perMessageDeflate) {
      Ti.API.warn('WebSocket option "perMessageDeflate" is currently not supported in Titanium.');
      /*
      @todo support PerMessageDeflate
      perMessageDeflate = new PerMessageDeflate(
        opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
        false,
        opts.maxPayload
      );
      opts.headers['Sec-WebSocket-Extensions'] = format({
        [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
      });
      */
    }

    if (protocols) {
      opts.headers['Sec-WebSocket-Protocol'] = protocols;
    }
    if (opts.origin) {
      if (opts.protocolVersion < 13) {
        opts.headers['Sec-WebSocket-Origin'] = opts.origin;
      } else {
        opts.headers.Origin = opts.origin;
      }
    }
    if (parsedUrl.username || parsedUrl.password) {
      opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
    }
    this.options = opts;

    const self = this;
    this.socket = Ti.Network.Socket.createTCP({
      host: opts.host,
      port: opts.port,
      timeout: opts.timeout,
      connected: e => {
        this.sender = new Sender(this.socket);
        this.performWsHandshake();
        Ti.Stream.pump(self.socket, self.processInputStream.bind(self), 64 * 1024, true);
      },
      error: e => {
        this.readyState = WebSocket.CLOSED;
        this.emitEvent('error', e.error);
      }
    });
    this.socket.connect();
  }

  pong(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      this.sendAfterClose(data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this.sender.pong(data || EMPTY_BUFFER, mask, cb);
  }

  send(data, options, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'number') {
      data = data.toString();
    }

    if (this.readyState !== WebSocket.OPEN) {
      this.sendAfterClose(data, cb);
      return;
    }

    const opts = {
      binary: typeof data !== 'string',
      compress: false,
      fin: true,
      ...options
    };

    this.sender.send(data || EMPTY_BUFFER, opts, cb);
  }

  close(code, reason) {
    if (this.readyState === WebSocket.CLOSED) {
      return;
    }
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      return abortHandshake(this, msg);
    }

    const closeSocket = () => {
      this.socket.close();
      this.emitClose(code, reason);
    };

    if (this.readyState === WebSocket.CLOSING) {
      if (this.closeFrameSent && this.closeFrameReceived) {
        closeSocket();
      }
      return;
    }

    this.readyState = WebSocket.CLOSING;
    this.sender.close(code, reason, err => {
      this.closeFrameSent = true;
      if (this.closeFrameReceived) {
        closeSocket();
      }
    });
  }

  generateSecWebSocketKey() {
    return randomBytes(16).toString('base64');
  }

  emitClose(code = 1006, message = '') {
    this.readyState = WebSocket.CLOSED;

    this.emitEvent('close', code, message);
  }

  disconnectAndEmitError(error, closeCode) {
    this.emitEvent('error', error);
    this.close(closeCode || CloseCode.abnormal, error.message);
  }

  performWsHandshake() {
    let httpHeader = `GET ${this.options.path} HTTP/1.1\r\n`;
    httpHeader += `Host: ${this.options.host}\r\n`;
    Object.keys(this.options.headers).forEach(headerName => {
      const headerValue = this.options.headers[headerName];
      httpHeader += `${headerName}: ${headerValue}\r\n`;
    });
    httpHeader += '\r\n';
    const data = Ti.createBuffer({
      value: httpHeader
    });
    this.socket.write(data, () => {});
  }

  processHandshake(buffer) {
    const httpFrameEnd = buffer.indexOf('\r\n\r\n');
    const response = buffer.slice(0, httpFrameEnd + 4).toString();
    const restBuffer = buffer.slice(httpFrameEnd + 4);

    if (response.indexOf('HTTP/1.1 101') === -1) {
      abortHandshake(this, 'Invalid HTTP status code received during WebSocket hanshake.');
      return;
    }

    const headers = {};
    const headerPattern = /([\w-]+): (.*)/g;
    let match;
    while ((match = headerPattern.exec(response)) !== null) {
      headers[match[1].toLowerCase()] = match[2];
    }
    const secWebSocketAccept = headers['sec-websocket-accept'];
    const hash = Buffer.from(Ti.Utils.sha1(this.secWebSocketKey + GUID), 'hex').toString('base64');
    if (hash !== secWebSocketAccept) {
      abortHandshake(this, 'Invalid Sec-WebSocket-Accept header');
      return;
    }

    this.readyState = WebSocket.OPEN;
    this.emitEvent('open');

    if (restBuffer.length) {
      this.processDataFramesInBuffer(restBuffer);
    }
  }

  processInputStream(e) {
    if (e.bytesProcessed === -1) {
      if (this.readyState === WebSocket.CLOSED) {
        // socket is already in closed state, nothing to do
        return;
      }

      this.socketOnClose();
      return;
    }

    if (!e.buffer) {
      throw new Error('No buffer to process in socket pump callback');
    }

    const buffer = Buffer.from(e.buffer.toBlob().toArrayBuffer());
    if (this.readyState === WebSocket.CONNECTING) {
      this.processHandshake(buffer);
    } else {
      this.processDataFramesInBuffer(buffer);
    }
  }

  processDataFramesInBuffer(buffer) {
    while (buffer.length >= 2) {
      buffer = this.processDataFrame(buffer);
    }
    if (buffer.length > 0) {
      throw new Error('Fragmented data in buffer which cannot be processed');
    }
  }

  processDataFrame(buffer) {
    let response = this.responseStack.last;
    const bufferLength = buffer.length;
    const isFin = (FinMask & buffer[0]) !== 0;
    const opcode = OpcodeMask & buffer[0];
    const isMasked = (MaskMask & buffer[1]) !== 0;
    const payloadLength = PayloadLengthMask & buffer[1];
    let payloadDataOffset = 2;

    if (isMasked) {
      return this.disconnectAndEmitError(new Error('Received masked data from server'), CloseCode.protocolError);
    }

    const isControlFrame = opcode === OpcodeConnectionClose || opcode === OpcodePing;
    // @todo check for valid opcode

    if (isControlFrame && isFin === false) {
      return this.disconnectAndEmitError(new Error('Control frames can\'t be fragmented.'), CloseCode.protocolError);
    }

    let payloadDataLength = payloadLength;
    if (payloadLength === 126) {
      payloadDataLength = buffer[2] << 8 | buffer[3] & 0xffff;
      payloadDataOffset += 2;
    } else if (payloadLength === 127) {
      // @todo: handle extended payload length of 64 bit unsinged int
      throw new Error('unsupported payload length of 64 bit unsinged int');
    }
    let framePayloadDataLength = payloadDataLength;
    if (framePayloadDataLength > bufferLength) {
      framePayloadDataLength = bufferLength - payloadDataOffset;
    }

    const data = Buffer.alloc(payloadDataLength);
    buffer.copy(data, 0, payloadDataOffset, payloadDataOffset + payloadDataLength);

    let isNewResponse = false;
    if (response === null) {
      isNewResponse = true;
      response = new WebSocketResponse();
      response.opcode = opcode;
      response.bytesLeft = payloadDataLength;
      response.buffer = data;
    } else {
      if (opcode === OpcodeContinueFrame) {
        response.bytesLeft = payloadDataLength;
      } else {
        this.disconnectAndEmitError(new Error('A frame after a fragmeneted message must be a continue frame.'));
      }
      response.buffer = Buffer.concat([response.buffer, data]);
    }

    response.bytesLeft -= framePayloadDataLength;
    response.frameCount += 1;
    response.isFin = isFin;
    if (isNewResponse) {
      this.responseStack.push(response);
    }

    this.processResponse(response);

    const nextFrameOffset = payloadDataOffset + framePayloadDataLength;
    const nextFrameLength = buffer.length - nextFrameOffset;
    const nextFrame = Buffer.alloc(nextFrameLength);
    return buffer.copy(nextFrame, 0, nextFrameOffset);
  }

  /**
   * @todo Move this to a class that handles received frames
   *
   * @param {WebSocketResponse} response
   */
  processResponse(response) {
    if (response.isFin && response.bytesLeft <= 0) {
      if (response.opcode === OpcodePing) {
        const data = response.buffer;
        this.pong(data, !this.isServer, NOOP);
        this.emit('ping', data);
      } else if (response.opcode === OpcodeConnectionClose) {
        let closeReason = 'connection closed by server';
        let closeCode;
        const data = response.buffer;
        if (data.length === 0) {
          closeCode = CloseCode.noStatus;
        } else if (data.length === 1) {
          throw new RangeError('Invalid payload length 1');
        } else {
          closeCode = data.readUInt16BE(0);
          // @todo validate status code
          const buf = data.slice(2);
          closeReason = buf.toString();
        }

        this.closeFrameReceived = true;

        if (closeCode === CloseCode.noStatus) {
          this.close();
        } else {
          this.close(closeCode, closeReason);
        }
      } else if (response.opcode === OpcodeTextFrame) {
        const message = response.buffer.toString();
        this.emitEvent('message', {
          data: message
        });
      } else if (response.opcode === OpcodeBinaryFrame) {
        const data = Buffer.from(response.buffer);
        this.emitEvent('message', {
          data
        });
      }

      this.responseStack.pop();
    }
  }

  emitEvent(name, data) {
    const callbackPropertyName = `on${name}`;
    if (this[callbackPropertyName]) {
      this[callbackPropertyName](data);
    }

    this.emit(name, data);
  }

  /**
   * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
   * when the `readyState` attribute is `CLOSING` or `CLOSED`.
   *
   * @param {*} [data] The data to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendAfterClose(data, cb) {

    if (cb) {
      const err = new Error(
        `WebSocket is not open: readyState ${this.readyState} ` +
          `(${readyStates[this.readyState]})`
      );
      cb(err);
    }
  }

  socketOnClose() {
    this.readyState = WebSocket.CLOSING;
    this.socket = undefined;
    this.emitClose();
  }
};

function abortHandshake(webSocket, msg) {
  webSocket.readyState = WebSocket$2.CLOSING;

  if (webSocket.socket.state === Ti.Network.Socket.CONNECTED) {
    webSocket.socket.close();
  }

  webSocket.emitClose(CloseCode.abnormal, msg);
}

var websocket = WebSocket$2;

const WebSocket = websocket;

WebSocket.Sender = sender;

var src = WebSocket;

var WebSocket$1 = /*@__PURE__*/getDefaultExportFromCjs(src);

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Modified Vite client that works inside the Titanium JavaScript runtime.
 *
 * @see https://github.com/vitejs/vite/blob/57980d27ee10f1f92e532a0975d4ab39ce27d3ed/packages/vite/src/client/client.ts
 */
console.log('[vite] connecting...');
const socketProtocol = __HMR_PROTOCOL__ || 'ws';
const directSocketHost = __HMR_DIRECT_TARGET__;
const socket = new WebSocket$1(`${socketProtocol}://${directSocketHost}`, 'vite-hmr');
const base = '/';
socket.on('error', (e) => console.log(e));
socket.on('message', ({ data }) => {
    handleMessage(JSON.parse(data));
});
let isRestarting = false;
async function handleMessage(payload) {
    switch (payload.type) {
        case 'connected':
            console.log('[vite] connected.');
            // proxy(nginx, docker) hmr ws maybe caused timeout,
            // so send ping package let ws keep alive.
            setInterval(() => socket.send('ping'), __HMR_TIMEOUT__);
            break;
        case 'update':
            // if this is the first update and there's already an error overlay, it
            // means the page opened with existing server compile error and the whole
            // module script failed to load (since one of the nested imports is 500).
            // in this case a normal update won't work and a full reload is needed.
            // TODO: Implement error overlay for Titanium?
            /*
                if (isFirstUpdate && hasErrorOverlay()) {
                    window.location.reload()
                    return
                } else {
                    clearErrorOverlay()
                    isFirstUpdate = false
                }
                */
            payload.updates.forEach((update) => {
                if (update.type === 'js-update') {
                    queueUpdate(fetchUpdate(update));
                }
            });
            break;
        case 'full-reload': {
            socket.close();
            if (!isRestarting) {
                isRestarting = true;
                Ti.App._restart();
            }
            break;
        }
    }
}
let pending = false;
let queued = [];
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
    queued.push(p);
    if (!pending) {
        pending = true;
        await Promise.resolve();
        pending = false;
        const loading = [...queued];
        queued = [];
        (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
}
async function fetchUpdate({ path, acceptedPath, timestamp }) {
    const mod = hotModulesMap.get(path);
    if (!mod) {
        // In a code-splitting project,
        // it is common that the hot-updating module is not loaded yet.
        // https://github.com/vitejs/vite/issues/721
        return;
    }
    const moduleMap = new Map();
    const isSelfUpdate = path === acceptedPath;
    // make sure we only import each dep once
    const modulesToUpdate = new Set();
    if (isSelfUpdate) {
        // self update - only update self
        modulesToUpdate.add(path);
    }
    else {
        // dep update
        for (const { deps } of mod.callbacks) {
            deps.forEach((dep) => {
                if (acceptedPath === dep) {
                    modulesToUpdate.add(dep);
                }
            });
        }
    }
    // determine the qualified callbacks before we re-import the modules
    const qualifiedCallbacks = mod.callbacks.filter(({ deps }) => {
        return deps.some((dep) => modulesToUpdate.has(dep));
    });
    await Promise.all(Array.from(modulesToUpdate).map(async (dep) => {
        const disposer = disposeMap.get(dep);
        if (disposer) {
            await disposer(dataMap.get(dep));
        }
        const [path, query] = dep.split('?');
        try {
            const newMod = await import(
            /* @vite-ignore */
            base +
                path.slice(1) +
                `?import&t=${timestamp}${query ? `&${query}` : ''}`);
            moduleMap.set(dep, newMod);
        }
        catch (e) {
            warnFailedFetch(e, dep);
        }
    }));
    return () => {
        for (const { deps, fn } of qualifiedCallbacks) {
            fn(deps.map((dep) => moduleMap.get(dep)));
        }
        const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
        console.log(`[vite] hot updated: ${loggedPath}`);
    };
}
function warnFailedFetch(err, path) {
    if (err instanceof Error && !err.message.match('fetch')) {
        console.error(err);
    }
    console.error(`[hmr] Failed to reload ${path}. ` +
        'This could be due to syntax errors or importing non-existent ' +
        'modules. (see errors above)');
}
/* eslint-disable no-spaced-func */
const hotModulesMap = new Map();
const disposeMap = new Map();
const pruneMap = new Map();
const dataMap = new Map();
const customListenersMap = new Map();
const ctxToListenersMap = new Map();
/* eslint-enable no-spaced-func */
const createHotContext = (ownerPath) => {
    if (!dataMap.has(ownerPath)) {
        dataMap.set(ownerPath, {});
    }
    // when a file is hot updated, a new context is created
    // clear its stale callbacks
    const mod = hotModulesMap.get(ownerPath);
    if (mod) {
        mod.callbacks = [];
    }
    // clear stale custom event listeners
    const staleListeners = ctxToListenersMap.get(ownerPath);
    if (staleListeners) {
        for (const [event, staleFns] of staleListeners) {
            const listeners = customListenersMap.get(event);
            if (listeners) {
                customListenersMap.set(event, listeners.filter((l) => !staleFns.includes(l)));
            }
        }
    }
    const newListeners = new Map();
    ctxToListenersMap.set(ownerPath, newListeners);
    function acceptDeps(deps, callback = () => {
        /* empty default handler */
    }) {
        const mod = hotModulesMap.get(ownerPath) || {
            id: ownerPath,
            callbacks: []
        };
        mod.callbacks.push({
            deps,
            fn: callback
        });
        hotModulesMap.set(ownerPath, mod);
    }
    const hot = {
        get data() {
            return dataMap.get(ownerPath);
        },
        accept(deps, callback) {
            if (typeof deps === 'function' || !deps) {
                // self-accept: hot.accept(() => {})
                acceptDeps([ownerPath], ([mod]) => deps && deps(mod));
            }
            else if (typeof deps === 'string') {
                // explicit deps
                acceptDeps([deps], ([mod]) => callback && callback(mod));
            }
            else if (Array.isArray(deps)) {
                acceptDeps(deps, callback);
            }
            else {
                throw new Error('invalid hot.accept() usage.');
            }
        },
        acceptDeps() {
            throw new Error('hot.acceptDeps() is deprecated. ' +
                'Use hot.accept() with the same signature instead.');
        },
        dispose(cb) {
            disposeMap.set(ownerPath, cb);
        },
        prune(cb) {
            pruneMap.set(ownerPath, cb);
        },
        decline() {
            // TODO
        },
        invalidate() {
            // TODO should tell the server to re-perform hmr propagation
            // from this module as root
            Ti.App._restart();
        },
        // custom events
        on(event, cb) {
            const addToMap = (map) => {
                const existing = map.get(event) || [];
                existing.push(cb);
                map.set(event, existing);
            };
            addToMap(customListenersMap);
            addToMap(newListeners);
        }
    };
    return hot;
};
/**
 * urls here are dynamic require() urls that couldn't be statically analyzed
 */
function injectQuery(url, queryToInject) {
    var _a, _b;
    // can't use pathname from URL since it may be relative like ../
    const pathname = url.replace(/#.*$/, '').replace(/\?.*$/, '');
    // const { search, hash } = new URL(url, 'http://vitejs.dev');
    // simple regex search for now since we don't have URL class polyfill yet
    const search = (_a = url.match(/\?[^#]+/)) === null || _a === void 0 ? void 0 : _a[0];
    const hash = (_b = url.match(/#.+/)) === null || _b === void 0 ? void 0 : _b[0];
    return `${pathname}?${queryToInject}${search ? '&' + search.slice(1) : ''}${hash || ''}`;
}

exports.createHotContext = createHotContext;
exports.injectQuery = injectQuery;
//# sourceMappingURL=client.js.map
