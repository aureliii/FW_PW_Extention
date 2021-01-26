var fs = require('fs');
var parser = require('xml2json');
var format = require('xml-formatter');
var myMap = new Map();
myMap.set('apexClass', "classAccesses");
myMap.set('field', "fieldPermissions");
myMap.set('flow', "flowAccesses");
myMap.set('layout', "layoutAssignments");
myMap.set('object', "objectPermissions");
myMap.set('tab', "tabVisibilities");
myMap.set('name', "userPermissions");
fs.readFile( './GreenfieldNodeJs/ProfileTemplate.xml', function(err, data) {
  var jsonTemplate = JSON.parse(parser.toJson(data, {reversible: false}));
  var dirname='force-app/main/default/profiles/';
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      console.log(filename);
      fs.readFile(dirname + filename, function(err, data) {
        var json = JSON.parse(parser.toJson(data, {reversible: true}));
        for (var key of myMap.keys()) {
          var object = json["Profile"][myMap.get(key)];
          if(typeof object !== 'undefined' && typeof jsonTemplate["Profile"][key] !== 'undefined' && jsonTemplate["Profile"][key]){
            var objectFiltered = object.filter(function(value, index, arr){
              return jsonTemplate["Profile"][key].indexOf(value[key].$t)<0;
            });
            json["Profile"][myMap.get(key)]=objectFiltered;
          }
        }
        var stringified = JSON.stringify(json);
        var xml = parser.toXml(stringified);
        fs.writeFile(dirname + filename, format('<?xml version="1.0" encoding="UTF-8"?>'+xml, {collapseContent: true}), function(err, data) {
          if (err) {
            console.log(err);
          }
          else {
            console.log('updated!');
          }
        });
      });
    });
  });  
});
