
var path = require('path');
var site = require('./statictools');
var _ = require('lodash');

var avow = site.avow;
var getJSON = site.getJSON;
var each = site.each;
var err = site.err;

// return a set of all nodes reachable from the given key
function getReachableSet(graph, startKey){
  var seen = {};
  function _traverseGraph(key){
    if(key in seen || (!key in graph)){
      return;
    }
    else{
      seen[key] = true;
      var neighbors = graph[key] || [];
      neighbors.forEach(function(neighbor){
        _traverseGraph(neighbor);
      });
    }
  }
  _traverseGraph(startKey);
  return seen;
}

var buildDependencyGraph = avow(function (fulfill, reject, list) {
  console.log('building dependency tree');
  var initGraph = {};
  each(list, function(fulfill, reject, c) {
    // first, build the graph of each component's immediate dependencies
    // by reading each component's settings json file
    console.log(c);
    if (c === 'core') {
      fulfill();
      return;
    }
    var docPath = path.join('component',c,'xtag.json');
    getJSON(docPath).then(function(json) {
      initGraph[c] = json.dependencies || [];
      fulfill()
    }, err('could not load ' + docPath));
  }).then(function() {
    // then, flesh out the dependency graph by recursing through connections
    // and getting the reachable set for each node
    var dependencyGraph = {};
    _.keys(initGraph).forEach(function(key){
        // components omit self from dependencies, since this is redundant info
        var dependencies = _.omit(getReachableSet(initGraph, key), key);
        dependencyGraph[key] = _.keys(dependencies);
    });
    console.log("dependencies:\n", dependencyGraph);
    fulfill(dependencyGraph);
  }, reject);
});

var renderDownloadPage = avow(function (fulfill, reject, tree) {
  site.staticPage(path.join('build', 'templates', 'download.html'), 'download.html', { dependencies: tree });
  console.log('wrote download.html');
});

console.log('generating download page');

getJSON('build/components.json')
  .then(buildDependencyGraph, err('could not fetch component list'))
  .then(renderDownloadPage, err('could not get dependencies'))
  .then(false, err('problem'));

