const segmenting = require('./segmenting')
const utils = require('./utils')

const COMBINATOR_HALF_HEIGHT = 96 / 2;

const INSET_X = 20;
const INSET_Y = 10;
const WIRES_OFFSET = 5;

const hiliteColor_ = function(index) {
  switch (index) {
    case  1: return '#f00';
    case  2: return '#e50';
    case -1: return '#0c0';
    case -2: return '#0b4';
    default: return '#444';
  }
}

/**
 * Circuit network which contains all combinators and other networked things.
 */
class CircuitNetwork extends utils.Renderable {
  constructor() {
    super();
    this.tick = 0;
    /**
     * State is a map of wire names to maps of signal names to values.
     */
    this.state = {};
    this.hiliteWires = {};
    this.children = [];
    this.colorCalculator = new segmenting.WireColorCalculator();
  }

  /** Adds the child to this network. */
  add(child) {
    this.children.push(child);
    this.colorCalculator.add(child.inputs);
    this.colorCalculator.add(child.outputs);
  }

  /** Forces a wire to be a color. */
  forceColor(wire, color) {
    this.colorCalculator.forceColor(wire, color);
  }

  getState() {
    return [ this.tick, this.state ];
  }

  setState(arr) {
    this.tick = arr[0];
    this.state = arr[1];
    this.updateStateElem_();
  }

  /** Runs the simulation one tick forward. */
  step() {
    this.tick++;
    const newState = {};
    for (const c of this.children) {
      c.step(this.state, newState);
    }
    this.state = newState;
    this.updateStateElem_();
  }

  /** @Override */
  initElement(root) {
    root.classList.add('network-wrapper');
    this.networkElement = utils.createHtmlElement(root, 'div', ['network']);
    const detailWrapper = utils.createHtmlElement(root, 'div', ['detail-wrapper']);
    let yMax = 0;
    for (const c of this.children) {
      c.createElements(this.networkElement, detailWrapper, this);
      if (c.yPos > yMax) { yMax = c.yPos; }
    }
    this.networkElement.style.height = (yMax + 2) * COMBINATOR_HALF_HEIGHT;
    this.stateElem = utils.createHtmlElement(
        utils.createHtmlElement(root, 'div', ['state-wrapper']), 'div', ['state']);
    this.updateStateElem_();
    this.updateSegmentOverlay_();
    this.onresize_ = () => this.updateSegmentOverlay_();
    window.addEventListener('resize', this.onresize_);
  }

  destroy() {
    if (this.onresize_) {
      window.removeEventListener('resize', this.onresize);
    }
  }

  finalize() {
    this.colors = this.colorCalculator.getColors();
    this.segments = segmenting.getSegments(this, this.colors);
  }

  setSelected(combinator, wires) {
    if (this.selected) {
      this.selected.thumbnail.classList.remove('selected');
      this.selected.detail.classList.remove('selected');
    }
    this.selected = combinator;
    if (combinator) {
      this.selected.thumbnail.classList.add('selected');
      this.selected.detail.classList.add('selected');
    }

    wires = Array.from(new Set(wires)).sort();

    this.hiliteWires = {};
    const colorsUsed = new Set();
    for (let i = 0; i < wires.length; i++) {
      const wire = wires[i];
      const color = this.colors[wire];
      if (colorsUsed.has(color)) {
        this.hiliteWires[wire] = {red: 2, green: -2}[color];
      } else {
        colorsUsed.add(color);
        this.hiliteWires[wire] = {red: 1, green: -1}[color];
      }
    }

    this.updateSegmentOverlay_();
    this.updateStateElem_();
  }

  updateSegmentOverlay_() {
    if (this.segmentUnderlay) {
      this.segmentUnderlay.remove();
    }
    if (this.segmentOverlay) {
      this.segmentOverlay.remove();
    }
    if (!this.segments) {
      return;
    }
    this.segmentUnderlay = createSvgElement_(this.networkElement, 'svg');
    this.segmentUnderlay.classList.add('underlay');
    this.segmentOverlay = createSvgElement_(this.networkElement, 'svg');
    this.segmentOverlay.classList.add('overlay');
    const rect = this.networkElement.getBoundingClientRect();
    for (const svg of [this.segmentUnderlay, this.segmentOverlay]) {
      svg.classList.add('segments');
      svg.setAttribute('width', rect.width);
      svg.setAttribute('height', this.networkElement.scrollHeight);
    }
    const activeWires = Object.keys(this.hiliteWires).sort();

    const activeConnections = {};
    for (const segment of this.segments) {
      const hiliteIndex = this.hiliteWires[segment.from.wire] || 0;

      const fromRect =
          segment.from.combinator.thumbnail.getBoundingClientRect();
      const toRect =
          segment.to.combinator.thumbnail.getBoundingClientRect();

      const path = createSvgElement_(
          hiliteIndex ? this.segmentOverlay : this.segmentUnderlay, 'path');

      const xOffset =
          hiliteIndex ?
          // Highlighted wires: negative means start from the right.
          (hiliteIndex > 0 ?
           (hiliteIndex - 1) * WIRES_OFFSET + INSET_X :
           (hiliteIndex + 1) * WIRES_OFFSET + fromRect.width - INSET_X):
          // Non-highlighted wires: just go from center
          fromRect.width / 2;

      const yOffset =
          hiliteIndex ?
          (((hiliteIndex + 5) % 5) - 1) * WIRES_OFFSET + INSET_Y : INSET_Y;

      const x1 = fromRect.left + xOffset - rect.left;
      const x2 = toRect.left + xOffset - rect.left;

      const y1 = fromRect.top +
                 (segment.from.hOffset ? fromRect.height - yOffset : yOffset) +
                 this.networkElement.scrollTop -
                 rect.top;

      const y2 = toRect.top +
                 (segment.to.hOffset ? fromRect.height - yOffset : yOffset) +
                 this.networkElement.scrollTop -
                 rect.top;

      // TODO: one path / svg
      const d = ['M', x1, y1];
      d.push('L' + x1 + ',' + y2);
      d.push('L' + x2 + ',' + y2);
      path.setAttribute('d', d.join(' '));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', 5);
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke', hiliteColor_(hiliteIndex));
      if (hiliteIndex) {
        const k1 = x1 + ',' + y1;
        if (!(activeConnections[k1])) {
          activeConnections[k1] = {x: x1, y: y1, out: segment.from.hOffset};
        }
        const k2 = x2 + ',' + y2;
        if (!(activeConnections[k2])) {
          activeConnections[k2] = {x: x2, y: y2, out: segment.to.hOffset};
        }
      }
    }
    for (const k of Object.keys(activeConnections)) {
      const c = activeConnections[k];
      const circle = createSvgElement_(this.segmentOverlay, 'circle');
      circle.setAttribute('cx', c.x);
      circle.setAttribute('cy', c.y);
      circle.setAttribute('r', 6);
      circle.setAttribute('stroke-width', 2);
      circle.setAttribute('stroke', 'black');
      circle.setAttribute('fill', 'white');

      if (c.out) {
        const c2 = createSvgElement_(this.segmentOverlay, 'circle');
        c2.setAttribute('cx', c.x);
        c2.setAttribute('cy', c.y);
        c2.setAttribute('r', 2);
        c2.setAttribute('stroke-width', 1);
        c2.setAttribute('stroke', 'black');
      }
    }
  }

  updateStateElem_() {
    if (!this.stateElem) return;
    this.stateElem.innerHTML = '';
    utils.createHtmlElement(this.stateElem, 'div', ['tick'], 'Tick #' + this.tick);
    const wires = new Set(Object.keys(this.state).concat(Object.keys(this.hiliteWires)));
    for (const wire of Array.from(wires).sort()) {
      if (Object.keys(this.state[wire] || {}).length == 0 &&
          !(this.hiliteWires[wire])) {
        continue;
      }
      const wireElem =
          utils.createHtmlElement(this.stateElem, 'div', ['wire', this.colors[wire]]);
      if (this.hiliteWires[wire]) {
        wireElem.style.color = hiliteColor_(this.hiliteWires[wire]);
      }
      wireElem.onclick = () => {
        this.setSelected(null, [wire]);
      }
      utils.createHtmlElement(wireElem, 'div', ['name'], wire);
      if (this.state[wire]) {
        const signalTable =
            utils.createHtmlElement(wireElem, 'table', ['signal-table']);
        for (const k of Object.keys(this.state[wire]).sort()) {
          const tr = utils.createHtmlElement(signalTable, 'tr', []);
          utils.createHtmlElement(tr, 'td', ['signal'], k);
          utils.createHtmlElement(tr, 'td', ['value'], this.state[wire][k]);
        }
      }
    }
  }
}

const createSvgElement_ = function(root, tag) {
  const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
  root.appendChild(elem);
  return elem;
}

module.exports.CircuitNetwork = CircuitNetwork
