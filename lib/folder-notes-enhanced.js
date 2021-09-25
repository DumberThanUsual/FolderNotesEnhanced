'use babel';

import folderNotesEnhancedView from './folder-notes-enhanced-view';
import { CompositeDisposable } from 'atom';
import fs from 'fs';
import jsonfile from 'jsonfile';
var toStyleString = require('to-style').string

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
      noteEntryElements[i].appendChild(createNoteElement(constructedPath, json["notes"], color));
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
      console.log("walking to " + nextPath);
      walkJSON(json["subElements"][subElement], nextPath, rootPath, values);
    }
  }
}

/**
 * Determines if a list item has a note defined for it, and returns a Note Element if it does;
 */
var renderAttributes = function(json) {
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
    display: "inline-block",
    "height": "100%",
    "padding-left": "35px"
  });
  labelElement.setAttribute("style", style);

  console.log(labels);
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
        "font-size": "1em"
      });
      labelEntryElement.setAttribute("style", labelStyle);
      labelEntryElement.appendChild(labelText);
      labelElement.appendChild(labelEntryElement);
    }
  }

  console.log(labelElement);
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
    this.folderNotesEnhancedView = new folderNotesEnhancedView(state.folderNotesEnhancedViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.folderNotesEnhancedView.getElement(),
      visible: false
    });

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
          //console.log(mutation.type);
          if (mutation.type == 'childList') {
            mutation.addedNodes.forEach(function(node) {
              //renderAttributes(json);
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
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.folderNotesEnhancedView.destroy();
  },

// called when saving the state of the package between uses. Return value is passed to activate on next activation
  serialize() {
    return {
      folderNotesEnhancedViewState: this.folderNotesEnhancedView.serialize()
    };
  },

  toggle() {
    if (!this.notesVisible) {
      for (var i = 0; i < atom.project.getPaths().length; i++){
        const file = folderPaths[i] + '/folderNotesEnhanced.confignew.json';
        if (fs.existsSync(file)) {
          json[normaliseFilename(folderPaths[i])] = jsonfile.readFileSync(file);
        } else {
          return null;
        }
      }

      // pass in the target node, as well as the observer options
      observer.observe(target[0], config);
      renderAttributes(json);

    }
    else {
      observer.disconnect();
      destroyNotes();
    }

    this.notesVisible = !this.notesVisible;
  },

  editNotes() {
    // Show note editing dialogue
    var treeView = atom.packages.getActivePackage('tree-view');
    if(!treeView) return;
    treeView = treeView.mainModule.getTreeViewInstance();
    selectedPath = normaliseFilename(treeView.selectedPaths()[0]);
    for (let projectRoot in atom.project.getPaths()) {
      let normalisedProjectRoot = normaliseFilename(atom.project.getPaths()[projectRoot]);
      if (selectedPath.indexOf(normalisedProjectRoot) == 0) {
        let relativePath = selectedPath.replace(normalisedProjectRoot + "/", '');
        let projectName = normalisedProjectRoot.substring(normalisedProjectRoot.lastIndexOf('/')+1) + "/";
        console.log("Modify folder notes:");
        console.log(projectName + relativePath + ": " + json[normalisedProjectRoot]["notes"][relativePath]);
        this.modalPanel.show()
      }
    }
  }

};
