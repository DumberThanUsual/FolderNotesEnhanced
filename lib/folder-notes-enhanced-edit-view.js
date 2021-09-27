'use babel';
import fs from 'fs';
import path from 'path';
var toStyleString = require('to-style').string
const jsonfile = require('jsonfile')

//---------------------------------------------------------------------------
//--    Create the edit file notes and labels panel
//---------------------------------------------------------------------------

import {TextEditor, TextEditorView, Emitter, TextBuffer} from 'atom';

export default class editView {
  constructor(input, json) {

    var recurringJSON = json;

    for (let i in input["relativePathArray"]) {
      try {
        recurringJSON = recurringJSON["subElements"][input["relativePathArray"][i]];
      }
      catch(err) {
        return false;
      }
    }

    var newJSON = recurringJSON

    this.labels = [];
    if (recurringJSON.hasOwnProperty("labels")) {
      this.labels = recurringJSON["labels"];
    };
    this.notes = [];
    if (recurringJSON.hasOwnProperty("notes")) {
      this.notes = recurringJSON["notes"];
    }
    this.newjsonthing = newJSON;
    this.json = json;
    this.input = input;

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

    var labelEntryContainer = this.element.querySelector('.folderNotesEnhanced .labelEntry');

    for (var labeltemp = 0;labeltemp < this.labels.length; labeltemp += 1) {
      labelEntryElement = document.createElement("div");
      labelEntryElement.setAttribute("class", "folderNotesEnhanced");
      const labelStyle = toStyleString({
        display: "inline-block",
        "color": "white",
        "background-color": json["labelConfig"][this.labels[labeltemp]]["color"],
        "vertical-align": "top",
        "padding": "0 10px",
        "font-size": "1.5em",
        "font-weight": "bolder",
        "padding-right": "0"
      });
      labelEntryElement.setAttribute("style", labelStyle);

      let labelText = document.createElement("p");
      labelText.setAttribute("class", "folderNotesEnhanced");
      const labelTextStyle = toStyleString({
        "margin": "0",
        "display": "contents"
      });
      labelText.setAttribute("style", labelTextStyle);
      labelText.innerHTML = this.labels[labeltemp];

      labelEntryElement.appendChild(labelText);

      let labelRemove = document.createElement("span");
      labelRemove.setAttribute("class", ["folderNotesEnhanced icon icon-x removeIcon"]);
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

    this.notesInput = this.element.querySelector('.folderNotesEnhancedInputNotes');
    for (var note in this.notes){
      var inputField = new TextEditor({mini: true});
      inputField.element.innerText = this.notes[note];
      inputField.element.contentEditable = true;
      this.notesInput.appendChild(inputField.element);
    }

    inputField = new TextEditor({mini: true});
    inputField.element.initialText = "New note...";
    this.notesInput.appendChild(inputField.element);

    this.doSaveButton = this.element.querySelector('.controls .do-save');
    this.cancelButton = this.element.querySelector('.controls .cancel');

    //-------- Set handlers

    //-- Cancel button
    this.cancelButton.onclick = () => this.handleCancel();
    this.doSaveButton.onclick = () => this.handleSave();

  } //-- End constructor

  handleSave() {
    var JSONTempWrapper =  this.newjsonthing;
    var recurringJSON = this.json;

    for (var layer = 1; layer < this.input["relativePathArray"].length + 1; layer++){
      for (let i = 0; i < this.input["relativePathArray"].length - layer; i ++) {
        try {
          recurringJSON = recurringJSON["subElements"][this.input["relativePathArray"][i]];
        }
        catch (err) {
          return;
        }
      }

      if (this.input["relativePathArray"][layer]) {
        recurringJSON["subElements"][this.input["relativePathArray"][layer]] = JSONTempWrapper;
      }
      JSONTempWrapper = recurringJSON;
      recurringJSON = this.json;
    }


    console.log(JSONTempWrapper);

    const file = this.input["normalisedProjectRoot"] + '/folderNotesEnhanced.confignew.json';

    jsonfile.writeFile(file, JSONTempWrapper, function (err) {
      if (err) console.error(err)
    })

    this.element.parentNode.remove();
  }

  handleCancel() {
    this.element.parentNode.remove();
  }

  removeLabel(event) {
    var newjson = this.newjsonthing
    var label = event.srcElement.parentElement.innerText;
    event.srcElement.parentElement.remove();
    newjson["labels"].splice(newjson["labels"].indexOf(label), 1);;
    console.log(newjson);
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
