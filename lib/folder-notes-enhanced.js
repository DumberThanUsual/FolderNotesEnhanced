'use babel';

import editView from './folder-notes-enhanced-edit-view';
import { CompositeDisposable } from 'atom';
import fs from 'fs';
import jsonfile from 'jsonfile';
var toStyleString = require('to-style').string;

/**
  normalizes a filename to use unix forward-slashes
 */
const normaliseFilename = (path) => {
  if (path) {
      return path.replace(/\\/g, '/');
  }
}

/**
  * Walk the json tree
  */
var walkJSON = function(json, constructedPath, rootPath, values) {
  var dataPath = rootPath + constructedPath;
  var dataPathAlt = dataPath.replace(/\//g, '\\\\');

  var noteEntryElements = document.querySelectorAll('[data-path="' + dataPath + '"], [data-path="' + dataPathAlt + '"]');

  for (var i = 0; i < noteEntryElements.length; i++) {
    if (json.hasOwnProperty("color")) {
      var color = json["color"];
    } else {
      var color = values["color"];
    }

    if (json.hasOwnProperty("notes")) {
      if (json["notes"] != [""] && json["notes"] != "") {
        noteEntryElements[i].appendChild(createNoteElement(constructedPath, json["notes"], color));
      }
    }

    if (json.hasOwnProperty("labels")) {
      noteEntryElements[i].appendChild(createLabelElement(json["labels"], values["labelConfig"]));
    }
  }

  if (json.hasOwnProperty("color")) {
    values["color"] = json["color"];
  }

  if (json.hasOwnProperty("subElements")){
    for (let subElement in json["subElements"]) {
      let nextPath = constructedPath + '/' + subElement;
      walkJSON(json["subElements"][subElement], nextPath, rootPath, values);
    }
  }
}

/**
 * Determines if a list item has a note defined for it, and returns a Note Element if it does;
 */
var renderAttributes = function(json) {
  destroyNotes();
  for (var projectRoot in json) {
      //let normalisedProjectRoot = normaliseFilename(dataPath);
      walkJSON(json[projectRoot], "", projectRoot, {"color": "yellow", "labelConfig": json[projectRoot]["labelConfig"] });
  }
  return false;
};

/**
 *  Creates the HTML list and list items that comprise a Label.
 */

var createLabelElement = function (labels, labelConfig) {

  let labelElement;
  let labelEntryElement;

  labelElement = document.createElement("span");
  labelElement.setAttribute("class", "folderNotesEnhanced");
  const style = toStyleString({
    display: "inline-flex",
    "height": "100%",
    "padding-left": "35px"
  });
  labelElement.setAttribute("style", style);

  for (let label in labels) {
    if (labelConfig[labels[label]]) {
      let labelText = document.createElement("p");
      labelText.setAttribute("class", "folderNotesEnhanced");
      const labelTextStyle = toStyleString({
        "margin": "0"
      });
      labelText.setAttribute("style", labelTextStyle);

      labelText.innerHTML = labels[label];

      labelEntryElement = document.createElement("div");
      labelEntryElement.setAttribute("class", "folderNotesEnhanced");
      const labelStyle = toStyleString({
        display: "block",
        "color": "white",
        "background-color": labelConfig[labels[label]]["color"],
        "vertical-align": "top",
        "padding": "0 10px",
        "font-size": "1em",
        "font-weight": "bolder"
      });
      labelEntryElement.setAttribute("style", labelStyle);

      let RGBCol = labelEntryElement.style.backgroundColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      let brightness = 1;
      let R = Math.floor((255-RGBCol[1])*brightness);
      let G = Math.floor((255-RGBCol[2])*brightness);
      let B = Math.floor((255-RGBCol[3])*brightness);

      let c = [R/255, G/255, B/255];

  		for (var i = 0; i < c.length; ++i ) {
  			if (c[i] <= 0.03928) {
  				c[i] = c[i] / 12.92
  			} else {
  				c[i] = Math.pow((c[i] + 0.055) / 1.055, 2.4);
  			};
  		};

  		l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

      if (l < 0.5) {
        labelEntryElement.style.color = "black";
      } else {
        labelEntryElement.style.color = "white";
      }

      labelEntryElement.appendChild(labelText);
      labelElement.appendChild(labelEntryElement);
    }
  }

  return labelElement;
}

/**
 *  Creates the HTML list and list items that comprise a Note.
 */
var createNoteElement = function(noteKey, noteVal, color) {
  let noteElement;
  let noteEntryElement;
  noteElement = document.createElement("ul");
  noteElement.setAttribute("id", noteKey); // id of note is the key of the note in the json
  noteElement.setAttribute("class", "folderNotesEnhanced");
  const style = toStyleString({
    display: "inline-block",
    "vertical-align": "top",
  });
  noteElement.setAttribute("style", style);

  // Create the note Element
  if (noteVal instanceof Array) {
      for (var noteEntry in noteVal) {
          noteEntryElement = document.createElement("li");
          noteEntryElement.style.color = color;
          noteEntryElement.innerHTML = noteVal[noteEntry];
          noteElement.appendChild(noteEntryElement);
      }
  }
  else {
      noteEntryElement = document.createElement("li");
      noteEntryElement.style.color = color;
      noteEntryElement.innerHTML = noteVal;
      noteElement.appendChild(noteEntryElement);
  }

  return noteElement;
}

/**
 *  Calls destroyNote on each key in the config json
 */
var destroyNotes = function() {
  var elementList = document.querySelectorAll('.folderNotesEnhanced');
  for (var i = 0; i < elementList.length; i++) {
    if (elementList[i] != undefined) {
      elementList[i].outerHTML = '';
    }
  }
}

/* The root folder path */
var folderPaths = [];
var projectCount = atom.project.getPaths().length
for (var i = 0; i < projectCount; i++) {
  folderPaths[i] = atom.project.getPaths()[i];
  fs.watch(folderPaths[i], function (event, filename) {
    refreshJSON();
  });
}

var refreshJSON = function() {
  let newJSON = {};
  for (var i = 0; i < atom.project.getPaths().length; i++){
    const file = folderPaths[i] + '/folderNotesEnhanced.confignew.json';
    if (fs.existsSync(file)) {
      try {
        newJSON[normaliseFilename(folderPaths[i])] = jsonfile.readFileSync(file);
      }
      catch (err) {
        console.log(err);
      }
    }
  }
  if (newJSON != json) {
    json = newJSON;
    renderAttributes(json);
  }
}

var json = {};
target = document.querySelectorAll('.panes');

export default {
  folderNotesEnhancedView: null,
  modalPanel: null,
  subscriptions: null,
  notesVisible: false,
  observer: null,
  config: null,
  target: null,

  // called when package is initially loaded
  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'folder-notes-enhanced:toggle': () => this.toggle()
    }));

    // Register command that shows dialogue to edit notes

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'folder-notes-enhanced:edit': () => this.editNotes()
    }));

    if (json) {
      observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type == 'childList') {
            mutation.addedNodes.forEach(function(node) {
              if (!node.classList.contains("folderNotesEnhanced")) {
                renderAttributes(json);
              }
            });
          }
        });
      });

      // configuration of the observer:
      config = { attributes: true, childList: true, characterData: true, subtree: true }
    }

//dont know why it needs to be reenabed on start

    this.toggle();

  },

// called when the packed is deactivated
  deactivate() {
    try {
      this.modalPanel.destroy();
    }
    catch (exception) {
      return;
    }
    this.subscriptions.dispose();
    try {
      this.folderNotesEnhancedView.destroy();
    }
    catch (exception) {
      return;
    }
  },

// called when saving the state of the package between uses. Return value is passed to activate on next activation

  toggle() {
    if (!this.notesVisible) {
      // pass in the target node, as well as the observer options
      observer.observe(target[0], config);
      refreshJSON();

    }
    else {
      observer.disconnect();
      destroyNotes();
    }

    this.notesVisible = !this.notesVisible;
  },

  editNotes() {
    refreshJSON();
    // Show note editing dialogue
    var treeView = atom.packages.getActivePackage('tree-view');
    if(!treeView) return;
    treeView = treeView.mainModule.getTreeViewInstance();
    selectedPath = normaliseFilename(treeView.selectedPaths()[0]);

    for (let projectRoot in atom.project.getPaths()) {
      let normalisedProjectRoot = normaliseFilename(atom.project.getPaths()[projectRoot]);

      if (selectedPath.indexOf(normalisedProjectRoot) == 0) {
        var editViewInput = {};
        editViewInput["normalisedProjectRoot"] = normalisedProjectRoot;
        editViewInput["relativePath"] = selectedPath.replace(normalisedProjectRoot + "/", '');
        editViewInput["relativePathArray"] = selectedPath.replace(normalisedProjectRoot + "/", '').split("/");
        editViewInput["projectName"] = normalisedProjectRoot.substring(normalisedProjectRoot.lastIndexOf('/')+1) + "/";

        this.editView = new editView(editViewInput, json[normalisedProjectRoot]);
        this.modalPanel = atom.workspace.addModalPanel({
          item: this.editView.getElement(),
          visible: true
        });

        //console.log("Modify folder notes:");
        //console.log(projectName + relativePath + ": ");
      }
    }
  }

};
