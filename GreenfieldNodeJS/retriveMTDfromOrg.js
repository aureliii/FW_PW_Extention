var jsforce = require('jsforce');
var fs = require('fs');
var path = require('path');
var parser = require('xml2json');
var js2xmlparser = require("js2xmlparser");
var dirname='../force-app/main/default/profiles/';
var format = require('xml-formatter');
var M_ProfName_OBJPerm = new Map();
var listProfile = [];
let objects = [];
const metaProf = [];
var jsonTemplate ;

async function run() {
    let creds = JSON.parse(fs.readFileSync(path.resolve(__dirname, './salesforce-creds.json')).toString());
    let conn = new jsforce.Connection({
    loginUrl: creds.url
});
//******************* get all objects from org START   *************** */
try {
        await conn.login(creds.username, creds.password);

        var types = [{type: 'Profile', folder: null}];
        await conn.metadata.list(types, '50.0', function(err, metadata) {
            if (err) { return console.error('err', err); }
             
            metadata.forEach(function(profile){
            listProfile.push(profile.fullName);
              
          })
          console.log("listProfile dalla org " + listProfile);   
        })
    
        var i,j,temparray,chunk = 10;
        for (i=0,j=listProfile.length; i<j; i+=chunk) {
          temparray = listProfile.slice(i,i+chunk);
    
          await conn.metadata.readSync('Profile', temparray, function(err, metadata) {
              if (err) { console.error(err); }
              metadata.forEach(function(metadataProfile){  
                metaProf.push(metadataProfile);             
              });
              
            
          });    
        }
     //   console.log('metaProf ',metaProf);
        return metaProf;

    } catch (err) {
        console.error(err);
    }
    //******************* get all objects from org END   *************** */

}
function add(x, y) {
    return x + y;
  }

  module.exports = { run,add };