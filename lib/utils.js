const utils = {};

utils.MAX_INT =  2147483647;
utils.MIN_INT = -2147483647;

utils.createHtmlElement = function (parent, tag, classList, text) {
  const element = document.createElement(tag);
  if (classList) {
    for (const c of classList){
      element.classList.add(c);
    }
  }
  if (typeof text != 'undefined') {
    element.appendChild(document.createTextNode(text));
  }
  if (parent) {
    parent.appendChild(element);
  }
  return element;
}

utils.factorioHumanize = function (value) {
  if (value >= utils.MAX_INT) { return 'MAX'; }
  if (value <= utils.MIN_INT) { return '-MAX'; }
  const negate = value < 0;
  let v = negate ? -value : value;
  let suffixIndex = 0;
  while (v >= 1000) {
    v /= 1000;
    suffixIndex++;
  }
  return (negate ? '-' : '') + Math.floor(v) + ['', 'K', 'M', 'G'][suffixIndex]
}

/**
 * Modifies the "to" object to add every value for every key from the "from" object.
 * This essentially "merges" two wire values together to form the final result.
 * Keys with a value of 0 are removed. Values are clamped within -MAX_INT...MAX_INT.
 */
utils.mergeSignals = function (to, from) {
  for (const k of Object.keys(from)) {
    const result = (to[k] || 0) + from[k];
    if (result) {
      to[k] = result <= utils.MIN_INT ? utils.MIN_INT :
              result >= utils.MAX_INT ? utils.MAX_INT : result;
    } else {
      delete to[k];
    }
  }
}

class Renderable {
  getDomElement(parent) {
    if (!this.element) {
    	const element = utils.createHtmlElement(parent, 'div', []);
      this.initElement(element);
      this.element = element;
    }
    return this.element;
  }

  initElement(element) {}
}
utils.Renderable = Renderable;

module.exports = utils;
