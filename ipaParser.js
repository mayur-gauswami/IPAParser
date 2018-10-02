var fs = require( 'fs' );
var path = require( 'path' );
var process = require( "process" );
var _ = require('underscore');
var prompt = require("prompt");
var copy = require('copy');
var AdmZip = require('adm-zip');
require('console.table');
var exec = require('child_process').exec;

start();

function start() {

    var ipaPath = process.argv[2];
    var oldVersionPath = process.argv[3];

    var tempDir = __dirname+"/temp";
    removeDirectory(tempDir);
    fs.mkdirSync(tempDir);

    // Copy ipa
    copy(oldVersionPath, tempDir+"/temp", function(err, files1) {
        copy(ipaPath, tempDir+"/temp", function(err, files) {
            if (err) throw err;
            

            fs.renameSync(files[0].path, tempDir + "/app.zip")
            if (oldVersionPath) {
                fs.renameSync(files1[0].path, tempDir + "/old.zip")

                var zip = new AdmZip(tempDir+"/old.zip");
                fs.mkdirSync(tempDir+"/old");
                zip.extractAllTo(tempDir+"/old", /*overwrite*/true);
            }

            var zip = new AdmZip(tempDir+"/app.zip");
            fs.mkdirSync(tempDir+"/app");
            zip.extractAllTo(tempDir+"/app", /*overwrite*/true);

            var basePath = "";
            var dfiles = fs.readdirSync(tempDir+"/app/Payload/");
            for (var i in dfiles){
                var name = dfiles[i];
                if(path.extname(name) == ".app"){
                    basePath = tempDir+"/app/Payload/"+name;
                    break;
                }
            }

            main(ipaPath, basePath);

        });
    });

}

function removeDirectory(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        removeDirectory(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function main (ipaBasePath, basePath) {

    console.log("ipa : "+ ipaBasePath);
    console.log("base : "+basePath);

    var moveFrom;

    moveFrom = basePath;
    var tSize = totalSize(moveFrom);
    console.log('\x1b[36m%s\x1b[0m', "\n**************************************");
    console.log('\x1b[36m%s\x1b[0m', "***        Size analysis           ***");
    console.log('\x1b[36m%s\x1b[0m', "**************************************\n");

    console.log("\n --- Compressed Size: %s", formatSize(fs.statSync(ipaBasePath.toString()).size))
    console.log("\n ---- Total Size: %s \n", formatSize(tSize));

    listSizeInfo(moveFrom, true, tSize)

    console.log("\n -------- Frameworks ---------")
    moveFrom = basePath + "/Frameworks";
    listSizeInfo(moveFrom, true, totalSize(moveFrom))



    if (fs.existsSync(basePath + "/Watch/")) {
        console.log("\n ---- Watch -----")
        moveFrom = basePath + "/Watch/WatchApp.app"
        listSizeInfo(moveFrom, true, totalSize(moveFrom))
        console.log("---- Watch: Plugins -----")
        moveFrom = basePath + "/Watch/WatchApp.app/PlugIns/WatchApp\ Extension.appex"
        listSizeInfo(moveFrom, true, totalSize(moveFrom))
        console.log("---- Watch: Plugins | Frameworks -----")
        moveFrom = basePath + "/Watch/WatchApp.app/PlugIns/WatchApp\ Extension.appex/Frameworks"
        listSizeInfo(moveFrom, true, totalSize(moveFrom))
    }

    console.log('\x1b[36m%s\x1b[0m', "\n**************************************");
    console.log('\x1b[36m%s\x1b[0m', "***        Files analysis          ***");
    console.log('\x1b[36m%s\x1b[0m', "**************************************\n");

  
    function findTotalFileTypes (basePath, extensions) {
        var files = fs.readdirSync(basePath);
        var totalImagesSize = 0;
        var totalImagesCount = 0;
        for(i in files) {

            var file = files[i];
            var fromPath = path.join( basePath, file );
            var stat = fs.statSync(fromPath)

            if(_.contains(extensions, path.extname(fromPath))) {
                totalImagesSize += stat.size;
                totalImagesCount += 1;
            }
        }

        console.log("count : "+totalImagesCount);
        console.log("size : "+formatSize(totalImagesSize));
    }

    function getFileTypeInfo(basePath, fileTypes) {

        var imagesT = formatWalk(basePath, fileTypes);
        console.log( "-- Total: "+imagesT.count+" ["+formatSize(imagesT.size)+"] \n");

        console.log( "-- In bundle");
        findTotalFileTypes(basePath, fileTypes);

        console.log( "\n-- In Frameworks");
        var imagesF = formatWalk(basePath+"/Frameworks", fileTypes);
        console.log("count : "+imagesF.count);
        console.log("size : "+formatSize(imagesF.size));

    }

    // Find total images
    console.log("\x1b[35m%s\x1b[0m", "\n------ Total images ------ \n");
    getFileTypeInfo(basePath, [".png", ".jpg", ".jpge"]);

    if (fs.existsSync(basePath+"/Assets.car")) {
        console.log("\n-- In Assets Catalogue");
        fs.mkdirSync(basePath+"/Assets/");

        var cartool = __dirname+"/cartool"
        var output = require('child_process').execSync(cartool+" "+basePath+"/Assets.car "+basePath+"/Assets").toString('utf8');

        findTotalFileTypes(basePath+"/Assets", [".png", ".jpg", ".jpge"]);
    }

    var result = formatWalk(basePath, [".svg"])
    if (result.count > 0) {
        console.log("\x1b[35m%s\x1b[0m", "\n------ Total SVG ------ \n");
        getFileTypeInfo(basePath, [".svg"]);
    }


    // Find total storiboards
    console.log("\x1b[35m%s\x1b[0m", "\n------ Total storyboards ------ \n");
    getFileTypeInfo(basePath, [".storyboardc"]);

    // Find total nibs
    console.log("\x1b[35m%s\x1b[0m", "\n------ Total nibs ------ \n");
    getFileTypeInfo(basePath, [".nib"]);

    // New frameworks
    if (process.argv[3]) {

        console.log("\x1b[35m%s\x1b[0m", "\n------ Newly added frameworks ------");
        oldBasePath = __dirname + "/temp/old/Payload/"; // OLD

        var tbashPath = "";
        var dfiles = fs.readdirSync(oldBasePath);
        for (var i in dfiles){
            var name = dfiles[i];
            if(path.extname(name) == ".app"){
                tbashPath = oldBasePath+name;
                break;
            }
        }

        tbashPath += "/Frameworks"

        var oldFiles = fs.readdirSync(tbashPath);
        var newFiles = fs.readdirSync(basePath + "/Frameworks");
        var diff = _.difference(newFiles, oldFiles);

        logInfo(true, null, diff, basePath + "/Frameworks");
    }

}



////// Utils /////

function listSizeInfo(targetPath, includeFiles, parentTotalSize) {

    var files = fs.readdirSync(targetPath);
    logInfo(includeFiles, parentTotalSize, files, targetPath);

}

function logInfo(includeFiles, parentTotalSize, files, bPath) {

    var fileInfo = [];
    var result;

    for (i in files) {

        var file = files[i];
        var fromPath = path.join( bPath, file );
        var stat = fs.statSync(fromPath)

        if(stat.isFile()){
            if (includeFiles == true) {
                if (parentTotalSize) {
                    var perc = ((stat.size/parentTotalSize)*100).toFixed(2);
                    if (perc > 0.4) {
                        fileInfo.push({"name": path.basename(fromPath), "size": stat.size, isFile: true, percentage: perc + " %"})
                    }
                } else {
                    fileInfo.push({"name": path.basename(fromPath), "size": stat.size, isFile: true})
                }
            }
            //console.log( "'%s' - '%s'", path.basename(fromPath), formatSize(stat.size) );
        } else {
            var tlSize = totalSize(fromPath);
            if (parentTotalSize) {
                var perc = ((tlSize/parentTotalSize)*100).toFixed(2);
                if (perc > 0.4) {
                    fileInfo.push({"name": path.basename(fromPath), "size": tlSize, isFile: false, percentage: perc + " %"})
                }
            } else {
                fileInfo.push({"name": path.basename(fromPath), "size": tlSize, isFile: false})
            }
            //console.log( "'%s' - '%s'", path.basename(fromPath), formatSize(allFiles.length) );
        }

    }


    result = _.each(_.sortBy(fileInfo, "size").reverse(), function (item) {
        item.size = formatSize(item.size)
        item.isFile = item.isFile ? "File" : "Directory"
    })

    console.table(result);

}

function totalSize(fromPath) {

    var allFiles = getFiles(fromPath).map(function(file) {
            return fs.readFileSync(file);
        }).join('\n');

    return allFiles.length;
}

function getFiles(dir) {
  dir = dir.replace(/\/$/, '');
  return _.flatten(fs.readdirSync(dir).map(function(file) {
    var fileOrDir = fs.statSync([dir, file].join('/'));
    if (fileOrDir.isFile()) {
      return (dir + '/' + file).replace(/^\.\/\/?/, '');
    } else if (fileOrDir.isDirectory()) {
      return getFiles([dir, file].join('/'));
    }
  }));
}

function formatSize(val) {
    if (val/1000 > 1000) {
        return (val/(1000*1000)).toFixed(2) + " MB"
    } else {
        return (val/1000).toFixed(2) + " KB"
    }
}

function walk (dir, fileTypes) {
    var results = []
    var list = fs.readdirSync(dir)
    list.forEach(function(file) {
        file = dir + '/' + file
        var stat = fs.statSync(file)
        if(_.contains(fileTypes, path.extname(file))){
            results.push(file)
        } else if (stat && stat.isDirectory()){
            results = results.concat(walk(file, fileTypes))
        }  
    })

    return results
}

function formatWalk(dir, fileTypes){

    var results = walk(dir, fileTypes);
    var size = 0;
    results.forEach(function(file) {
        var stat = fs.statSync(file.toString())
        size += stat.size;  
    })
    return { 'count': results.length, 'size': size} 

}
