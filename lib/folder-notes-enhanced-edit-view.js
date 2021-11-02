'use babel';
import fs from 'fs';
import path from 'path';
var toStyleString = require('to-style').string;
const jsonfile = require('jsonfile');

//---------------------------------------------------------------------------
//--    Create the edit file notes and labels panel
//---------------------------------------------------------------------------

import {TextEditor, TextEditorView, Emitter, TextBuffer} from 'atom';

export default class editView {
  constructor(input, json) {

    this.json = json;
    this.input = input;

    var recurringJSON = json;

    for (let i in input["relativePathArray"]) {
      if (!recurringJSON.hasOwnProperty("subElements")){
        recurringJSON["subElements"] = {};
      }
      if (!recurringJSON["subElements"].hasOwnProperty(input["relativePathArray"][i])){
        recurringJSON["subElements"][input["relativePathArray"][i]] = {};
      }
      recurringJSON = recurringJSON["subElements"][input["relativePathArray"][i]];
    }

    this.newJSON = recurringJSON;

    if (this.newJSON.hasOwnProperty("labels")) {
      this.newJSON["labels"]  = recurringJSON["labels"];
    } else {
      this.newJSON["labels"] = [];
    }
    this.notes = [];
    if (recurringJSON.hasOwnProperty("notes")) {
      this.notes = recurringJSON["notes"];
    } else {
      recurringJSON["notes"] = [];
    }


    //-- Load the html template and parse it
    const templateString = fs.readFileSync(
      path.resolve(__dirname, 'templates/editView.html'),
      {encoding: 'utf-8'});

    const parser = new DOMParser();
    const doc = parser.parseFromString(templateString, 'text/html');

    this.element = doc.querySelector('.folderNotesEnhanced-root').cloneNode(true);

    // Find important nodes
    this.pathDisplay = this.element.querySelectorAll('.folderNotesEnhancedPath');
    for (let element in this.pathDisplay){
      this.pathDisplay[element].innerHTML = input["projectName"] + input["relativePath"];
    }

    this.renderLabels();

    this.notesInput = this.element.querySelector('.folderNotesEnhancedInputNotes');

    this.notesInputField = new TextEditor({mini: true});
    this.notesInput.appendChild(this.notesInputField.element);
    this.notesInputField.element.contentEditable = true;
    this.notesInputField.insertText(this.notes.toString());

    this.updateLabelSelector();

    this.doSaveButton = this.element.querySelector('.controls .do-save');
    this.cancelButton = this.element.querySelector('.controls .cancel');
    this.addLabelButton = this.element.querySelector('.folderNotesEnhanced .do-addLabel');

    //-------- Set handlers

    //-- Cancel button
    this.cancelButton.onclick = () => this.handleCancel();
    this.doSaveButton.onclick = () => this.handleSave();
    this.addLabelButton.onclick = () => this.handleAddLabel(document.querySelector(".folderNotesEnhanced.labelSelect").value);

  } //-- End constructor

  handleSave() {
    try {
      let notesInput = this.notesInputField.getText().split(',');
      for(let note in notesInput) {
        notesInput[note].trim();
      }
      this.newJSON["notes"] = notesInput;
    }
    catch (err) {
      this.newJSON["notes"] = [];
    }

    var JSONTempWrapper =  this.newJSON;
    var recurringJSON = this.json;
    var pathArray = this.input["relativePathArray"];

    for (var layer = 1; layer < pathArray.length + 1; layer++){

      for (let i = 0; i < pathArray.length - layer; i ++) {
        if (!recurringJSON.hasOwnProperty("subElements")){
          recurringJSON["subElements"] = {};
        }
        if (!recurringJSON["subElements"].hasOwnProperty(pathArray[i])){
          recurringJSON["subElements"][this.input["relativePathArray"][i]] = {};
        }
        recurringJSON = recurringJSON["subElements"][pathArray[i]];
      }

      if (pathArray[layer]) {
        recurringJSON["subElements"][pathArray[pathArray.length - layer]] = JSONTempWrapper;
      }
      JSONTempWrapper = recurringJSON;
      recurringJSON = this.json;
    }

    const file = this.input["normalisedProjectRoot"] + '/folderNotesEnhanced.confignew.json';

    jsonfile.writeFileSync(file, JSONTempWrapper);

    this.element.parentNode.remove();
  }

  handleCancel() {
    this.element.parentNode.remove();
  }

  removeLabel(event) {
    var label = event.srcElement.parentElement.innerText;
    this.newJSON["labels"].splice(this.newJSON["labels"].indexOf(label), 1);
    this.renderLabels();
    this.updateLabelSelector();
  }

  handleAddLabel(label) {
    this.newJSON["labels"].push(label);
    this.renderLabels();
    this.updateLabelSelector();
  }

  renderLabels() {

    var labelEntryContainer = this.element.querySelector('.folderNotesEnhanced .labelEntry');

    labelEntryContainer.innerHTML = "";

    for (var labeltemp = 0;labeltemp < this.newJSON["labels"].length; labeltemp += 1) {
      labelEntryElement = document.createElement("div");
      labelEntryElement.setAttribute("class", "folderNotesEnhanced");
      const labelStyle = toStyleString({
        display: "inline-block",
        "color": "white",
        "background-color": this.json["labelConfig"][this.newJSON["labels"] [labeltemp]]["color"],
        "vertical-align": "top",
        "padding": "0 10px",
        "font-size": "1.5em",
        "font-weight": "bolder",
        "padding-right": "0",
        "height": "100%"
      });
      labelEntryElement.setAttribute("style", labelStyle);

      let labelText = document.createElement("p");
      labelText.setAttribute("class", "folderNotesEnhanced labelEntryContents");
      const labelTextStyle = toStyleString({
        "margin": "0",
        "display": "contents",
        "height": "100%"
      });
      labelText.setAttribute("style", labelTextStyle);
      labelText.innerHTML = this.newJSON["labels"] [labeltemp];

      labelEntryElement.appendChild(labelText);

      let labelRemove = document.createElement("span");
      labelRemove.setAttribute("class", ["folderNotesEnhanced icon icon-x removeIcon labelEntryContents"]);
      const labelRemoveStyle = toStyleString({
        "margin": "0",
        "margin-left": "5px"
      });
      labelRemove.setAttribute("style", labelRemoveStyle);
      labelRemove.onclick = (event) => {
        this.removeLabel(event);
      }

      labelEntryElement.appendChild(labelRemove);

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

      labelEntryContainer.appendChild(labelEntryElement);


    }
  }

  updateLabelSelector() {
    let labelAddSelect = this.element.querySelector(".folderNotesEnhanced .labelSelect");
    labelAddSelect.innerHTML = "";

    for (let label in this.json["labelConfig"]) {
      if (this.newJSON["labels"] .indexOf(label) == -1) {
        let labelOption = document.createElement("option");
        labelOption.setAttribute("value", label);
        labelOption.innerHTML = label;
        labelAddSelect.appendChild(labelOption);
      }
    }
  }

  getElement() {
    return this.element;
  }

  destroy() {
    this.element.parentNode.remove();
  }

  serialize(){
    return {};
  }

} //-- End class
