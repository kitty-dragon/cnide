//
// Entry point for the web interface
//

const parser = require('../build/parser')
const serialize = require('./serialize')
const utils = require('./utils')

const HELLO_WORLD_ = 'Main() {\n  \n}'

const createButton_ = function(parentElement, text, icon, onClick) {
  const elem = utils.createHtmlElement(parentElement, 'a', ['btn']);
  utils.createHtmlElement(elem, 'i', ['icon', 'fa', 'fa-' + icon]);
  utils.createHtmlElement(elem, 'div', ['text'], text);
  elem.title = text;
  elem.onclick = onClick;
  return elem;
}

class Editor {
  constructor(parentElement) {
    this.wrapperElement =
      utils.createHtmlElement(parentElement, 'div', ['editor-wrapper', 'editing'])
    const menu = utils.createHtmlElement(this.wrapperElement, 'div', ['menu']);

    const edit = utils.createHtmlElement(menu, 'div', ['edit', 'mode']);
    createButton_(edit, 'Run', 'play', () => this.compileAndRun());
    createButton_(edit, 'Export', 'book', () => this.compileAndExport());
    const gitHub = createButton_(edit, 'GitHub', 'github', () => this.autosave())
    gitHub.href='https://github.com/charredutensil/cnide';
    gitHub.target='blank';
    gitHub.classList.add('right');

    const run = utils.createHtmlElement(menu, 'div', ['run', 'mode']);
    createButton_(run, 'Edit', 'code', () => this.returnToEditMode());
    createButton_(run, 'Pause', 'pause', () => this.compiled.pause());
    createButton_(run, 'Step', 'step-forward', () => this.compiled.step());
    createButton_(run, 'Slow', 'play', () => this.compiled.run(500));
    createButton_(run, 'Fast', 'forward', () => this.compiled.run(1000/60));

    const xport = utils.createHtmlElement(menu, 'div', ['export', 'mode']);
    createButton_(xport, 'Edit', 'code', () => this.returnToEditMode());

    const editorElement = utils.createHtmlElement(
        this.wrapperElement, 'div', ['editor', 'edit', 'mode']);
    this.textarea = utils.createHtmlElement(editorElement, 'textarea');
    this.textarea.value = localStorage.getItem('autosave') || HELLO_WORLD_;
    this.textarea.addEventListener('keypress', (event) => this.handleKeyPress_(event));
    this.compiled = null;
  }

  autosave() {
    localStorage.setItem('autosave', this.textarea.value);
  }

  compile_() {
    this.autosave();
    try {
      const network = parser.parse(this.textarea.value);
      return network;
    } catch (e) {
      if (e instanceof parser.SyntaxError) {
        alert('Syntax Error on line ' + e.location.start.line + ':\n' + e.message);
        this.textarea.setSelectionRange(e.location.start.offset, e.location.end.offset);
        this.textarea.blur();
        this.textarea.focus();
        return null;
      } else {
        throw e;
      }
    }
  }

  compileAndRun() {
    if (this.compiled) { return; }
    const network = this.compile_();
    if (!network) { return; }
    this.compiled = new Emulator(network, this.wrapperElement);
    this.textarea.disabled = true;
    window.setTimeout(() => {
      this.wrapperElement.classList.remove('editing');
      this.wrapperElement.classList.add('running');
    }, 1);
  }
  compileAndExport() {
    if (this.compiled) { return; }
    const cn = this.compile_();
    if (!cn) { return; }

    let string;

    try {
      string = serialize(cn);
    } catch (err) {
      alert(err.message);
      return;
    }

    this.compiled = new Exporter(string, this.wrapperElement);
    this.textarea.disabled = true;
    window.setTimeout(() => {
      this.wrapperElement.classList.remove('editing');
      this.wrapperElement.classList.add('exporting');
    }, 1);
  }
  returnToEditMode() {
    if (!this.compiled) { return; }
    this.compiled.destroy();
    this.compiled = null;
    this.wrapperElement.classList.remove('exporting');
    this.wrapperElement.classList.remove('running');
    this.wrapperElement.classList.add('editing');
    this.textarea.disabled = false;
  }

  handleKeyPress_(event) {
    if (event.keyCode == 13) {
      event.preventDefault();
      const v = this.textarea.value;
      const start = this.textarea.selectionStart;
      let indent = '\n';
      for (let i = v.lastIndexOf('\n', start - 1) + 1;
           i < v.length && v[i] == ' '; i++) {
        indent += ' ';
      }
      if (start || start == '0') {
        const end = this.textarea.selectionEnd;
        this.textarea.value = v.substring(0, start) + indent + v.substring(end, v.length);
      } else {
        this.textarea.value += indent;
      }
      this.textarea.selectionStart =
          this.textarea.selectionEnd = start + indent.length;;
    }
  }
}

class Emulator {
  constructor(network, parentElement) {
    this.interval = 0;
    this.network = network;
    const element = this.network.getDomElement(parentElement);
    element.classList.add('run');
    element.classList.add('mode');
  }

  step_() {
    this.network.step();
  }

  pause() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = 0;
    }
  }

  step() {
    this.pause();
    this.step_();
  }

  run(millisPerTick) {
    this.pause();
    this.interval = window.setInterval(() => this.step_(), millisPerTick);
  }

  destroy() {
    this.pause();
    window.setTimeout(() => this.network.getDomElement(null).remove(), 400);
  }
}

class Exporter {
  constructor(string, parentElement) {
    this.editorElement = utils.createHtmlElement(
        parentElement, 'div', ['editor', 'export', 'mode']);
    this.textarea = utils.createHtmlElement(this.editorElement, 'textarea');
    this.textarea.value = string;
    this.textarea.readOnly = true;
  }

  destroy() {
    window.setTimeout(() => this.editorElement.remove(), 400);
  }
}

const ui = {}
ui.Editor = Editor
document.addEventListener('DOMContentLoaded', () => new ui.Editor(document.body))

window.onerror = function(msg, src, line, col, error) {
  document.body.classList.add('fatal');
  try {
    src = src.substring(src.indexof('cnide'));
  } catch (e) {}
  try {
    if (src && line) {
      msg = msg + ' [line ' + line + ', col ' + col + ' of ' + src + ']';
    }
  } catch (e) {}
  try {
    utils.createHtmlElement(
        document.body, 'div', ['fatal-error-message'], msg);
  } catch (e) {}
  return false;
}
