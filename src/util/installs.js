var path = require('path');
var fs = require('fs');
var assert = require('assert');

let items;

function loadItems() {
  var file = path.normalize(saasplat.systemdb);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file)) || {};
  } else {
    return {};
  }
}

function saveItems(items) {
  var file = path.normalize(saasplat.systemdb);
  fs.writeFileSync(file, JSON.stringify(items, null, 2));
}

export default {
  find : (name) => {
    assert(name);
    if (!this.items) {
      this.items = this.loadItems();
    }
    return {name, version: this.items[name]};
  },

  save : ({name, version}) => {
    assert(name);
    assert(version);
    if (!this.items) {
      this.items = this.loadItems();
    }
    this.items[name] = version;
    this.saveItems(this.items);
  }
}
