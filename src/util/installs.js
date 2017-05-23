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
  find: (name, status, version) => {
    assert(name);
    if (!this.items) {
      this.items = this.loadItems();
    }
    return items.filter(item => item.name == name &&
      (status == undefined || item.status == status) &&
      (version == undefined || item.version == version)
    );
  },

  has: (status) => {
    return !!items.find(item => item.status == status);
  },

  commit: () => {
    if (!this.items) {
      this.items = this.loadItems();
    }
    this.items.forEach(item => {
      if (item.status == 'waitCommit') {
        item.status = 'install';
      }
    });
    this.saveItems(this.items);
  },

  rollback: () => {
    if (!this.items) {
      this.items = this.loadItems();
    }
    this.items.filter(item => item.status == 'waitCommit').forEach(item=>{
      const exists = this.items.find(it => it.name == item.name && it.version == item.version);
      if (exists) {
        this.items.splice(this.items.indexOf(exists), 1);
      }
    });
    this.saveItems(this.items);
  },

  save: (...items) => {
    if (!this.items) {
      this.items = this.loadItems();
    }
    items.filter(item => item.status == 'uninstall').forEach(item => {
      const exists = this.items.find(it => it.name == item.name && it.version == item.version);
      if (exists) {
        this.items.splice(this.items.indexOf(exists), 1);
      }
    });
    items.filter(item => item.status != 'uninstall').forEach(item => {
      const exists = this.items.find(it => it.name == item.name && it.version == item.version);
      if (exists) {
        exists.status = item.status;
        exists.installDate = item.installDate;
      } else {
        this.items.push(item);
      }
    });
    this.saveItems(this.items);
  }
}
