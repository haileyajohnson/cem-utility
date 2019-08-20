
/**
 * Global variables
 */
var configJSON;
var mapInterface;
var modelInterface;
const CLIENT_ID = '762501139172-rjf0ia3vv9edu6gg0m46aoij519khuk7.apps.googleusercontent.com';
var selectedTab;
var tabs;

var $lon1;
var $lat1;
var $lon2;
var $lat2;
var $rotation;

function Tab(id, elem, loadFunc) {
    return {
        id: id,
        elem: elem,
        loadFunc: loadFunc
    };
}


function loadApp() {
    var onImmediateFailed = function () {
        $('.g-sign-in').removeClass('hidden');
        $('.output').text('(Log in to see the result.)');
        $('.g-sign-in .button').click(function () {
            ee.data.authenticateViaPopup(function () {
                // If the login succeeds, hide the login button and run the analysis.
                $('.g-sign-in').addClass('hidden');
                initialize();
            });
        });
    };
    // Attempt to authenticate using existing credentials.
    ee.data.authenticate(CLIENT_ID, initialize, null, null, onImmediateFailed);
}

function initialize() {
    configJSON = {};

    mapInterface = MapInterface();
    mapInterface.initMap();
    
    // create tabs
    tabs = []
    tabs.push(Tab(0, '#gridTab', gridTabView));
    tabs.push(Tab(1, '#waveTab', waveTabView));
    tabs.push(Tab(2, '#condsTab', condsTabView));
    tabs.push(Tab(3, '#runTab', runTabView));
    $.each(tabs, (i, t) => { $(t.elem).on('click', () => { onTabChange(t.id); })});
    selectedTab = tabs[0];
    $(selectedTab.elem).attr("selected", "selected");

    // set up initial input screen
    initInputs();
}

function initInputs() {
    $rotation = $("input[name=rotation]");
    $rotation.val(rad_to_deg(mapInterface.rotation));
    $rotation.change(onRotationChange);
    var $numRows = $("input[name=numRows]");
    $numRows.val(mapInterface.numRows);
    $numRows.change(onNumRowsChange);
    var $numCols = $("input[name=numCols]");
    $numCols.val(mapInterface.numCols);
    $numCols.change(onNumColsChange);

    
    $lon1 = $("input[name=lon1]");
    $lat1 = $("input[name=lat1]");
    $lon2 = $("input[name=lon2]");
    $lat2 = $("input[name=lat2]");

    $(".coord").change(onCoordsChange);
}

/**
 * Tab views
 */

 function gridTabView() {
    $(".grid-tab-view").show();
 }

 function waveTabView() {
    $(".wave-tab-view").show();
 }

 function condsTabView() {
    $(".conds-tab-view").show();
 }

 function runTabView() {
    $(".run-tab-view").show();
 }

/**
 *  Event listeners and
 *  event callbacks
 */

function onTabChange(id) {
    if (id == selectedTab.id) { return; }
    // clear current tab
    $(selectedTab.elem).removeAttr("selected");
    $(".tab-view-container").children().hide();

    //selecte new tab
    selectedTab = tabs[id];
    $(selectedTab.elem).attr("selected", "selected");
    selectedTab.loadFunc();
}

function onGoClicked() {
     mapInterface.mapTransform();
     disableInputs();
     disableClear();
}

function onDrawClicked() {
    mapInterface.toggleDrawMode();
}

function onBoxChange() {
    var coords = mapInterface.box.getCoordinates()[0];
    $("input[name=lon1]").val(coords[0][0]);
    $("input[name=lat1]").val(coords[0][1]);
    $("input[name=lon2]").val(coords[2][0]);
    $("input[name=lat2]").val(coords[2][1]);
}

function onRotationChange(rot) {    
    $rotation.val(rad_to_deg(rot));
    mapInterface.map.getView().setRotation(
        deg_to_rad(tryParseFloat($rotation.val()), mapInterface.rotation));
}

function onCoordsChange() {
    var coords = mapInterface.box ? mapInterface.box.getCoordinates()[0] : [["", ""], [], ["", ""]];
    var lon1 = tryParseFloat($lon1.val(), coords[0][0]);
    var lat1 = tryParseFloat($lat1.val(), coords[0][1]);
    var lon2 = tryParseFloat($lon2.val(), coords[2][0]);
    var lat2 = tryParseFloat($lat2.val(), coords[2][1]);

    if ($(".coord").toArray().some((elem) => {
        return !($(elem).val());
    })) {
        return;
    }
    mapInterface.updateBox(lon1, lat1, lon2, lat2);
}

function onNumRowsChange() {

    mapInterface.setNumRows(tryParseInt($("input[name=numRows]").val()), mapInterface.numRows);
    if (mapInterface.box) {
        mapInterface.drawGrid();
    }
}

function onNumColsChange() {
    mapInterface.setNumCols(tryParseInt($("input[name=numCols]").val()), mapInterface.numCols);
    if (mapInterface.box) {
        mapInterface.drawGrid();
    }
}

function onClear() {
    mapInterface.clearMap();
    enableInputs();
    $(".coord").val("");
}

function disableInputs() {
    $(".coord").attr("disabled", "disabled");
    $(".draw-button").attr("disabled", "disabled");
    $(".go-button").attr("disabled", "disabled");
}

function enableInputs() {
    $(".coord").removeAttr("disabled");
    $(".draw-button").removeAttr("disabled");
    $(".go-button").removeAttr("disabled");
}

function allowClear() {
    $(".clear-button").removeAttr("disabled");
}

function disableClear() {
    $(".clear-button").attr("disabled", "disabled");    
}

function onSave() {
    updateJSON();
    saveConfig();
}

function onLoad() {
    $('#file-input').trigger('click');
}

/**
 * Save/load function
 */

function updateJSON() {
    // save view settings
    var viewSettings = {
        center: mapInterface.map.getView().getCenter(),
        zoom: mapInterface.map.getView().getZoom()
    }
    configJSON.viewSettings = viewSettings;

    // save grid inputs
    var coords = mapInterface.box ? mapInterface.box.getCoordinates()[0] : null;
    var gridConfig = {
        rotation: mapInterface.rotation,
        numRows: mapInterface.numRows,
        numCols: mapInterface.numCols,
        grid: mapInterface.cemGrid
    };
    if (coords) {
        gridConfig.points = [coords[0], coords[2]];
    }
    configJSON.gridConfig = gridConfig;

    // save wave inputs

    // save config inputs
}

function importJSON(newContent) {
    // clear map
    mapInterface.clearMap();
    // load config file
    configJSON = JSON.parse(newContent);

    // load map view settings
    mapInterface.map.getView().setCenter(configJSON.viewSettings.center);
    mapInterface.map.getView().setZoom(configJSON.viewSettings.zoom);

    // load grid inputs
    var gridConfig = configJSON.gridConfig;
    onRotationChange(gridConfig.rotation);    
    var $numRows = $("input[name=numRows]");
    $numRows.val(gridConfig.numRows); 
    onNumColsChange()  
    var $numCols = $("input[name=numCows]");
    $numCols.val(gridConfig.numCols);
    onNumColsChange();
    mapInterface.cemGrid = gridConfig.grid;
    if (gridConfig.points) {
        var points = gridConfig.points;
        $("input[name=lon1]").val(points[0][0]);
        $("input[name=lat1]").val(points[0][1]);
        $("input[name=lon2]").val(points[1][0]);
        $("input[name=lat2]").val(points[1][1]);
        onCoordsChange();
    }

    // load wave inpts

    // load config inputs
}

function saveConfig() {    
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(configJSON)], {type: 'application/octet-stream'});
    a.href = URL.createObjectURL(file);
    a.download = "config.json";
    a.click();
}

 function loadConfig() {
    // getting a hold of the file reference
    var file = this.event.target.files[0]; 
    
    // setting up the reader
    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');

    reader.onload = (readerEvent) => {
        var content = readerEvent.target.result;
        importJSON(content)
    };
 }
