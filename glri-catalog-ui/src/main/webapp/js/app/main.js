'use strict';

/* Controllers */
var GLRICatalogApp = angular.module('GLRICatalogApp', []);

GLRICatalogApp.controller('CatalogCtrl', function($scope, $http) {

	$scope.FACET_DEFS = [
		{name: "Any", initState: "active", isAny: true},
		{name: "Data", initState: ""},
		{name: "Publication", initState: ""},
		{name: "Project", initState: ""}
	];
	$scope.RESOURCE_TYPE_ANY = "Any";
	
  $scope.orderProp = 'title';
  $scope.resourceFilter = 'Any';	//user selected resource type to filter by
  $scope.rawResult = null;		//JS object constructed from JSON returned from query service request
  $scope.resultItems = null;	//just the items array in the raw results
  $scope.currentFacets = {};	//counts of the facets
  
  $scope.doLoad = function(event) {
	  
	event.preventDefault();
	event.stopPropagation();
	$http.get(buildDataUrl()).success(function(data) {
		$scope.updateRawResults(data);
		$scope.doLocalLoad($scope.getFilteredResults());
	});
  };
  
  $scope.doLocalLoad = function(recordsArray) {
	  $scope.records = recordsArray;
  };
  
  $scope.filterChange = function(newFilterValue) {
	  $scope.resourceFilter = newFilterValue;
	  $scope.doLocalLoad($scope.getFilteredResults());
  };
  
  $scope.updateRawResults = function(unfilteredJsonData) {
		$scope.rawResult = unfilteredJsonData;
		
		//Add some aggregation and calc'ed values
		$scope.resultItems = $scope.processGlriResults(unfilteredJsonData.items);
		
		$scope.updateFacetCount($scope.rawResult.searchFacets[0].entries);
	};
	
	$scope.updateFacetCount = function(facetJsonObject) {

		//reset all facets to zero
		for (var i in $scope.FACET_DEFS) {
			var facet = $scope.FACET_DEFS[i];
			
			if (! (facet.isAny == true)) {
				$scope.currentFacets[term] = count;
				$('#resource_input .btn input[value=' + facet.name + '] + span').html("0");
			}
		}
		
		for (var i in facetJsonObject) {
			var term = facetJsonObject[i].term;
			var count = facetJsonObject[i].count;

			$scope.currentFacets[term] = count;
			$('#resource_input .btn input[value=' + term + '] + span').html(count);
		};
	};
	
	$scope.getFilteredResults = function() {
		if ($scope.resourceFilter != null && $scope.resultItems != null) {
			
			if ($scope.resourceFilter == $scope.RESOURCE_TYPE_ANY) {
				return $scope.resultItems;
			} else {
				var data = new Array();

				for (var i in $scope.resultItems) {
					var item = $scope.resultItems[i];
					if (item.browseCategories[0] == $scope.resourceFilter) {
						data.push(item);
					}
				}

				return data;
			}
		} else {
			return $scope.resultItems;
		}
	};
	
	$scope.processGlriResults = function(resultRecordsArray) {
		var records = resultRecordsArray;
		var newRecords = [];

		for (var i=0; i<records.length; i++) {
			var item = records[i];
			var link = item['link']['url'];
			item['url'] = link;

			var resource = item['browseCategories'][0];
			if (resource != null) {
				resource = resource.toLowerCase();
			} else {
				resource = "unknown";
			}
			item['resource'] = resource;

			switch (resource) {
				case "project":
					item['project_url'] = "http://google.com";
					break;
				case "publication":
					item['publication_url'] = "http://google.com";
					break;
				case "data":
					item['data_download_url'] = "http://google.com";
					break;
				default:


			}

			var contacts = item['contacts'];
			for (var j=0; j<contacts.length; j++) {
				var contact = contacts[j];
				var type = contact['contactType'];

				if (type == null) type = contact['type'];

				if ("Point of Contact" == type) {
					item['contact'] = contact['name'] + " (Point of Contact)";
					break;
				} else if ("Author" == type) {
					item['contact'] = contact['name'] + " (Author)";
					break;
				} else if ("Project Chief" == type) {
					item['contact'] = contact['name'] + " (Project Chief)";
					break;
				} else {
					item['contact'] = "???"
				}

			}
			
			newRecords.push(item);
		}
		
		return newRecords;
	};
	
	$scope.hasVisibleResults = function() {
		var results = $scope.getFilteredResults();
		return (results != null && results.length > 0);
	}
	
	$scope.getVisibleResultCount = function() {
		var results = $scope.getFilteredResults();
		if (results != null && results.length > 0) {
			return results.length;
		} else {
			return 0;
		}
	}
	
  
});


$(document).ready(function(){
    // Sets up click behavior on all button elements with the alert class
    // that exist in the DOM when the instruction was executed
	
    $("#loc_type_input").on( "change", function(event) {updateLocationList(event)});
	
	/* Kick off the fancy selects */
	$('.selectpicker').selectpicker();
	
	initSelectMap();
});


function buildDataUrl() {
	var url = $("#sb-query-form").attr("action");
	url += "?" + $("#sb-query-form :input[name!='resource']").serialize();
	return url;
}

function updateLocationList(event) {
	
	//location type just selected by the user
	var typeSelection = event.currentTarget.options[event.currentTarget.selectedIndex].value;
	
	$("#loc_name_input optgroup").each(function() {
		if (this.label.indexOf(typeSelection + "s") == 0) {
			$(this).removeAttr("disabled");
		} else {
			$(this).attr("disabled", "disabled");
		}
	});
	
	//No location selection made prior to this is valid, so clear out.
	$("#loc_name_input").val("");
	$("#loc_name_input").selectpicker('refresh')
}


///////////
// Map Functions
///////////
function initSelectMap() {
	
	var lon = -85.47;
	var lat = 45.35;
	var zoom = 5.25;
	var map, worldStreet, worldGray, openlayersBase, boxLayer;
	
	map = new OpenLayers.Map('map');

	worldStreet = new OpenLayers.Layer.ArcGIS93Rest( "World Street Map",
		"http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export", 
		{layers: "show:0"});
	worldGray = new OpenLayers.Layer.ArcGIS93Rest( "World Light Gray Base",
		"http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/export", 
		{layers: "show:0"});
	openlayersBase = new OpenLayers.Layer.WMS( "OpenLayers Base",
		"http://vmap0.tiles.osgeo.org/wms/vmap0?", {layers: 'basic'});

	boxLayer = new OpenLayers.Layer.Vector("Box layer");

	map.addLayers([worldStreet, worldGray, openlayersBase, boxLayer]);
	map.addControl(new OpenLayers.Control.LayerSwitcher());
	map.addControl(new OpenLayers.Control.MousePosition());

	var boxControl = new OpenLayers.Control.DrawFeature(boxLayer,
			OpenLayers.Handler.RegularPolygon, {
				handlerOptions: {
					sides: 4,
					irregular: true
				}
			}
		);

	// register a listener for removing any boxes already drawn
	boxControl.handler.callbacks.create = function(data) {
		if(boxLayer.features.length > 0) {
			boxLayer.removeAllFeatures();
		}
	};
	
	// register a listener for drawing a box
	boxControl.events.register('featureadded', boxControl,
			function(f) {

		// Variables for the geometry are: bottom/left/right/top
		// Sciencebase requires bounds to look like: [xmin,ymin,xmax,ymax]
		var extent = "["
				+ f.feature.geometry.bounds.left + ","
				+ f.feature.geometry.bounds.bottom
				+ "," + f.feature.geometry.bounds.right
				+ "," + f.feature.geometry.bounds.top
				+ "]";

		$('#xmin_label').val(f.feature.geometry.bounds.left);
		$('#ymin_label').val(f.feature.geometry.bounds.bottom);
		$('#xmax_label').val(f.feature.geometry.bounds.right);
		$('#ymax_label').val(f.feature.geometry.bounds.top);

		$('#spatial').val(extent);
	});


	map.addControl(boxControl);
	map.setCenter(new OpenLayers.LonLat(lon, lat), 5);
	
	$('#drawBox').click(function() {
		if($(this).is(':checked')) {
			boxControl.handler.stopDown = true;
			boxControl.handler.stopUp = true;
			boxControl.activate();
		} else {
			boxControl.handler.stopDown = false;
			boxControl.handler.stopUp = false;
			boxControl.deactivate();
		}
	});
	
	$('#clearMapButton').click(function() {
		$('#spatial').val('');
		$('#xmin_label').val('-');
		$('#ymin_label').val('-');
		$('#xmax_label').val('-');
		$('#ymax_label').val('-');

		boxLayer.removeAllFeatures();
		map.setCenter(new OpenLayers.LonLat(lon, lat), 5);				
	});
	
}