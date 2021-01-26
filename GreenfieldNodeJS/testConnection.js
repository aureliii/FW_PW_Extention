var jsforce = require('jsforce');
var fs = require('fs');
var path = require('path');
var parser = require('xml2json');
var js2xmlparser = require("js2xmlparser");
var dirname='force-app/main/default/profiles/';
var format = require('xml-formatter');
var M_ProfName_OBJPerm = new Map();
var listProfile = [];
let objects = [];
const metaProf = [];
var jsonTemplate ;

var myMap = new Map();
myMap.set('apexClass', "classAccesses");
myMap.set('field', "fieldPermissions");
myMap.set('flow', "flowAccesses");
myMap.set('layout', "layoutAssignments");
myMap.set('object', "objectPermissions");
myMap.set('tab', "tabVisibilities");
myMap.set('name', "userPermissions");





async function run() {
    let creds = JSON.parse(fs.readFileSync(path.resolve(__dirname, './salesforce-creds.json')).toString());
    let conn = new jsforce.Connection({
    loginUrl: creds.url
});
//******************* get all objects from org START   *************** */
try {
        await conn.login(creds.username, creds.password);

        console.log('Connected to Salesforce!');
        
        let soql = "SELECT SobjectType From ObjectPermissions Group By sObjectType";
        metadata = await conn.query(soql)
        .on("record", (record) => {
            objects.push(record.SobjectType);
        })
        .on("end", async () => {
            console.log(`Fetched objects. Total records fetched: ${objects.length}`);
        })
        .on("error", (err) => {
            console.error(err);
        })
        .run({
            autoFetch: true,
            maxFetch: 10000 //lo setto quanto vuoi (si usa max fatch se vogliamo retrivare + di 2k) 
        });
  //      console.log(metadata);
        console.log('list of objects from org '+objects);
      //  return objects;
 /*       return new Promise(resolve => {
            setTimeout(function() {
              resolve(objects)
              console.log("fast promise is done")
            }, 1000)
          })
*/
    // now you can use conn to read/write data...
    //  await conn.logout();
    } catch (err) {
        console.error(err);
    }
    //******************* get all objects from org END   *************** */
      

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
        fs.readFile( './GreenfieldNodeJs/ProfileTemplate.xml', function(err, data) {
          jsonTemplate = JSON.parse(parser.toJson(data, {reversible: false}));
          
      
          metadata.forEach(function(metadataProfile){  
            metaProf.push(metadataProfile);
            M_ProfName_OBJPerm[metadataProfile.fullName] = M_ProfName_OBJPerm[metadataProfile.fullName] || [];
            M_ProfName_OBJPerm[metadataProfile.fullName].push(metadataProfile.objectPermissions);


            for (var key of myMap.keys()) {
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
      /*      
            fs.writeFile(dirname + metadataProfile.fullName+'.profile-meta.xml', format(xml, {collapseContent: true}), function(err, data) {
              if (err) {
                console.log(err);
              }
              else {
                
             //   console.log('updated!');
              }
            });
         */   
          });
          
        });
      });    
    }
 //   console.log('metaProf ',metaProf);
    return metaProf;
}

async function f(){
    try {
  //      console.log('prima');
        const objectNames = [];
        //console.log('objects ',objects);
        var meta = await run();
        meta.forEach(function(metadataProfile){ 
   //       console.log('full name '+ metadataProfile.fullName);
  //        console.log('full metadataProfile ', metadataProfile);
      //    console.log('typeof metadataProfile.objectPermissions'+ typeof metadataProfile.objectPermissions);
          if ( metadataProfile.hasOwnProperty('objectPermissions') &&  typeof metadataProfile.objectPermissions !== 'undefined') {

     //       console.log('  objectPermission length  '+metadataProfile.objectPermissions.length);
     //       console.log('  instance off   ',Array.isArray(metadataProfile.objectPermissions));
            if (!Array.isArray(metadataProfile.objectPermissions)) {
              if (objectNames.includes(metadataProfile.objectPermissions.object)) {
                objectNames.push(metadataProfile.objectPermissions.object);
              }
                
                metadataProfile.objectPermissions = Object.entries(metadataProfile.objectPermissions);
   //             console.log('solo 1 obj perm  '+metadataProfile.objectPermissions.object);
   //             console.log('  instance off per 1 elemento    ',Array.isArray(metadataProfile.objectPermissions));
            } else {
              for(var permObject of metadataProfile.objectPermissions){
            //       console.log(' objectPermission struct ',permObject);
     //               console.log(' typeof objectPermission struct ',typeof permObject);
                    if ( permObject  !== null && permObject.object !== null  && objectNames.includes(permObject.object)) {
                  //    console.log(' objectPermission struct  nel if',permObject);
                      objectNames.push(permObject.object);
                    }         
      //              console.log('dopo il push ');
                  }
 //                 console.log('for chiuso ');
            }
            console.log('profile name  '+metadataProfile.fullName);
            console.log('objects  '+objects);
            console.log(' objectNames '+objectNames);
  
              let difference = objects.filter(x => !objectNames.includes(x));
              console.log(' difference '+difference);
              
              Object.entries(difference).forEach(([key, value]) => {
                var newObjPerm = {
                    allowCreate: false,
                    allowDelete: false,
                    allowEdit: false,
                    allowRead: false,
                    modifyAllRecords: false,
                    object: value,
                    viewAllRecords: false
                };
                metadataProfile.objectPermissions.push(newObjPerm);
   //             console.log( `${key}: ${value}`);
     //           console.log('newObjPerm ',newObjPerm);               
              });

              

              metadataProfile.objectPermissions = metadataProfile.objectPermissions.sort((a, b) => (a.object > b.object) ? 1 : -1);
              metadataProfile["@"]={"xmlns":"http://soap.sforce.com/2006/04/metadata"};
              var options = {
                declaration: {
                    "encoding": "UTF-8"
                }
              };
              var xml=js2xmlparser.parse("Profile", metadataProfile, options);
              
              fs.writeFile('C:/Users/aurel/Desktop/Projects/GreenDev1/GreenfieldNodeJS/testWrite'+'.profile-meta.xml', format(xml, {collapseContent: true}), function(err, data) {
                if (err) {
                  console.log(err);
                }
                else {
                 console.log('updated!');
                }
              });
          //    console.log('struct with newObjPerm filtered ',metadataProfile.objectPermissions);      
          }
              for (var key of myMap.keys()) {
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
                 console.log('profili updated!');
                }
              });         
         });
     //   console.log('dopo');
       // console.log('objects ',meta);
  /*       const mapafter = new Map(Object.entries(M_ProfName_OBJPerm));
        console.log(' mapa dopo le chiavi ',mapafter.keys());
        console.log(' ReadOnly ',mapafter.get('ReadOnly')[0]);
       
        for(var permObject of mapafter.get('ReadOnly')[0]){
          console.log(' objectName ',permObject.object);
          objectNames.push(permObject.object);
        }
    */    

        
      
  

      
    } catch (error) {
      console.log('sono nel catch di f()!' + error.message);
    }
    
}
f();
