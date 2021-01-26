var fs = require('fs');
var path = require('path');
var util = require('util');
var jsforce = require('jsforce');
var parser = require('xml2json');//
//import { Connection, Org } from "@salesforce/core";
const { toXML } = require('jstoxml');
var dirname='force-app/main/default/profiles/';
var credDirname = 'GreenfieldNodeJS\salesforce-creds.json';
var mtd;
var parsedProfiles = [];
var objectNameFromOrg = [];
var M_ProfName_OBJPerm = new Map();
const xmlOptions = {
  header: true,
  indent: '  '
};
var js2xmlparser = require("js2xmlparser");
var format = require('xml-formatter');
const { Console } = require('console');
var myMap = new Map();
myMap.set('apexClass', "classAccesses");
myMap.set('field', "fieldPermissions");
myMap.set('flow', "flowAccesses");
myMap.set('layout', "layoutAssignments");
myMap.set('object', "objectPermissions");
myMap.set('tab', "tabVisibilities");
myMap.set('name', "userPermissions");


//Connection conn2 = Connection();
var conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
   version : 50.0,
   loginUrl : 'https://test.salesforce.com'
});

conn.login('nini.laface@greenfield.it.dev1', 'Licia$003dNymP3Auj7j4cvUhqC4ApG1Q', function(err, userInfo) {
  if (err) { return console.error(err); }
  // Now you can get the access token and instance URL information.
  // Save them to establish connection next time.
  console.log(conn.accessToken);
  console.log(conn.instanceUrl);
  // logged in user property
  console.log("User ID: " + userInfo.id);
  console.log("Org ID: " + userInfo.organizationId);
  // ...
  var types = [{type: 'Profile', folder: null}];
  conn.metadata.list(types, '50.0', function(err, metadata) {
    if (err) { return console.error('err', err); }
      var listProfile = [];  
      metadata.forEach(function(profile){
        listProfile.push(profile.fullName);     
      })
      var i,j,temparray,chunk = 10;
      for (i=0,j=listProfile.length; i<j; i+=chunk) {
          temparray = listProfile.slice(i,i+chunk);
          // do whatever
        conn.metadata.readSync('Profile', temparray, function(err, metadata) {
          if (err) { console.error(err); }
          fs.readFile( './GreenfieldNodeJs/ProfileTemplate.xml', function(err, data) {
            var jsonTemplate = JSON.parse(parser.toJson(data, {reversible: false}));
                
                  metadata.forEach(function(metadataProfile){
                    M_ProfName_OBJPerm[metadataProfile.fullName] = M_ProfName_OBJPerm[metadataProfile.fullName] || [];
                    M_ProfName_OBJPerm[metadataProfile.fullName].push(metadataProfile.objectPermissions);
                    //create map ProfileName > List(objectPermission)
  /*                  console.log('tupeof full name '+typeof  metadataProfile.fullName);
                    console.log('tupeof '+typeof  M_ProfName_OBJPerm[metadataProfile.fullName]);
                    console.log('tupeof object permission '+typeof  metadataProfile.objectPermissions);
                    
                    console.log('metadataProfile Name ' ,metadataProfile.fullName);
                    console.log('metadataProfile objectPermissions ' ,metadataProfile.objectPermissions);
                    console.log('obj perm ', M_ProfName_OBJPerm[metadataProfile.fullName][0]);
         
                  */
                  
                 fs.readdir(dirname, function(err, filenames) {
                  if (err) {
                    onError(err);
                    return;
                  }
                  filenames.forEach(function(filename) {                       
                    
                      console.log('filename '+filename);                     
                      fs.readFile(dirname + filename, function(err, data) {
                               console.log('data parsed ',JSON.parse(parser.toJson(data, {reversible: false})));
                        
                        mtd = JSON.parse(parser.toJson(data, {reversible: false}));
          
          //                    console.log('mtd profile name '+mtd.Profile.fullName);
          //                    console.log('mtd objectPermissions ',mtd.Profile.objectPermissions);
                      });
                    
                  });
                });
                console.log('mtd  ',mtd);
                    


                    for (var key of myMap.keys()) {
                      console.log('Key '+key);
                      var object = metadataProfile[myMap.get(key)];                    
                      if(typeof object !== 'undefined' && typeof jsonTemplate["Profile"][key] !== 'undefined' && jsonTemplate["Profile"][key]){
                        var objectFiltered = object.filter(function(value, index, arr){
                          
                          return jsonTemplate["Profile"][key].indexOf(value[key])<0;
                        });                    
                        metadataProfile[myMap.get(key)]=objectFiltered;
                      }
                    }
                    
                    
                    
                    metadataProfile["@"]={"xmlns":"http://soap.sforce.com/2006/04/metadata"};
                    var options = {
                      declaration: {
                          "encoding": "UTF-8"
                      }
                    };
                    var xml=js2xmlparser.parse("Profile", metadataProfile, options);
                    
                    fs.writeFile(dirname + metadataProfile.fullName+'.profile-meta.xml', format(xml, {collapseContent: true}), function(err, data) {
                      if (err) {
                        console.log(err);
                      }
                      else {
                        console.log('updated!');
                      }
                    });
                  })
                  //end for (metadata from org)
                             
                });                           
        });
        
      }     
  });
});

async  function f() {
    let promise = new Promise((resolve, reject) => {
        setTimeout(() => resolve("done!"), 50000)
      });
      let result = await promise; // wait until the promise resolves (*)
      console.log(result); // "done!"
      

      //profili in locale
      
      

      
//    console.log('my beautiful map outside' ,M_ProfName_OBJPerm); 
//    console.log('valore nella mapa' ,M_ProfName_OBJPerm.get("Identity User valore")); 

    const mapafter = new Map(Object.entries(M_ProfName_OBJPerm));
    console.log(' mapa dopo le chiavi ',mapafter.keys()); 
    console.log(' ReadOnly ',mapafter.get('ReadOnly')[0]);
    const objectNames = [];
    for(var permObject of mapafter.get('ReadOnly')[0]){
      console.log(' objectName ',permObject.object);
      objectNames.push(permObject.object);
    }


    console.log(' objectNames '+objectNames);
  }
  f();

  run();
  async function run() {
      let creds = JSON.parse(fs.readFileSync(path.resolve(credDirname)).toString());
      let conn = new jsforce.Connection({
        loginUrl: creds.url
      });
      try {
          await conn.login(creds.username, creds.password);
          console.log('Connected to Salesforce!');
          // now you can use conn to read/write data...
          await conn.logout();
      } catch (err) {
          console.error(err);
      }
  }

