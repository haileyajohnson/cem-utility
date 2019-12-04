
/**
 * Global variables
 */
// config vars
var configJSON;
const CLIENT_ID = '762501139172-rjf0ia3vv9edu6gg0m46aoij519khuk7.apps.googleusercontent.com';
var socket;

// application interface objects
var mapInterface;
var modelInterface;


// views
var selectedTab;
var gridTab;
var wavTab;
var controlTab;
var runTab;
var modal;

// jQuery
var $saveButton;
var $loadButton;

function loadApp() {
    // Attempt to authenticate using existing credentials.
    ee.data.authenticate(CLIENT_ID, initialize, null, null, googleSignIn);
}

function initialize() {
    // configuration parameters
    configJSON = {};

    // create applicaiton interfaces
    mapInterface = MapInterface();
    mapInterface.initMap();


    // start up the SocketIO connection to the server
    socket = io.connect('http://' + document.domain + ':' + location.port + '/request');
    // this is a callback that triggers when the results event is emitted by the server.
    socket.on('results_ready', (msg) => {
        onUpdate(msg);
    });
    socket.on('model_complete', (msg) => {
        onModelComplete(msg);
    });
    
    // create tabs
    gridTab = GridTab();
    gridTab.init();
    waveTab = WaveTab();
    waveTab.init();
    controlTab = ControlsTab()
    controlTab.init();
    runTab = RunTab();
    runTab.init();
    
    // create modal dialog window
    modal = ModalInterface();
    modal.init();

    // init buttons
    $saveButton = $(".save-button");
    $loadButton = $(".load-button");

    // open grid tab
    onTabChange(gridTab);
}

function googleSignIn() {
    $('.g-sign-in').removeClass('hidden');
    $('.output').text('(Log in to see the result.)');
    $('.g-sign-in .button').click(function () {
        ee.data.authenticateViaPopup(function () {
            // If the login succeeds, hide the login button and run the analysis.
            $('.g-sign-in').addClass('hidden');
            initialize();
        });
    });
}

/**
 *  Event listeners 
 */
function onTabChange(newTab){
    if (selectedTab) {
        selectedTab.$tab.removeAttr("selected");
        selectedTab.$elem.hide();
    }
    newTab.$tab.attr("selected", "selected");
    newTab.$elem.show();
    selectedTab = newTab;
}

function onSave() {
    updateJSON();
    saveConfig();
}

function onLoad() {
    $('#file-input').trigger('click');
}

function onRun() {
    disableAll();
    // create payload
    var input_data = {
        grid: mapInterface.cemGrid,
        cellWidth: mapInterface.getCellWidth(),
        cellLength: mapInterface.getCellLength(),
        asymmetry: parseFloat(this.waveTab.a_val),
        stability: parseFloat(this.waveTab.u_val),
        waveHeight: parseFloat(this.waveTab.wave_height),
        wavePeriod: parseFloat(this.waveTab.wave_period),
        shelfSlope: parseFloat(this.controlTab.shelf_slope),
        shorefaceSlope: parseFloat(this.controlTab.shoreface_slope),
        numTimesteps: controlTab.num_timesteps,
        lengthTimestep: parseFloat(this.controlTab.length_timestep),
        saveInterval: parseInt(this.controlTab.save_interval)
    }
    // ensure necessary values are present and valid
    var status = validateData(input_data);
    if (status == 0) {
        socket.emit('run', input_data);
    }
}

function onUpdate(msg) {
    mapInterface.updateDisplay(msg.grid);
    runTab.displayTimestep(msg.time);
    runTab.updateOutput(msg);
}

function onModelComplete(msg) {
    mapInterface.mapTransform(getEndFilterDates(), false);
    enableAll();
}

/**
 * Helpers
 */

 function disableAll() {
    // save config
    $saveButton.disable();

    // grid tab
    gridTab.$clearButton.disable();
    gridTab.$editButton.disable();

    // wave tab
    waveTab.$asymmetry.disable();
    waveTab.$stability.disable();
    waveTab.$wave_height.disable();
    waveTab.$wave_period.disable();

    // conds tab
    controlTab.$shelf_slope.disable();
    controlTab.$shoreface_slope.disable();
    controlTab.$end_year.disable();
    controlTab.$length_timestep.disable();
    controlTab.$save_interval.disable();

    // run tab
    runTab.$runButton.enable();
    runTab.$outputButton.disable();

 }

 function enableAll() {
    // save config
    $saveButton.enable();

    // grid tab
    gridTab.$clearButton.enable();
    gridTab.$editButton.enable();

    // wave tab
    waveTab.$asymmetry.enable();
    waveTab.$stability.enable();
    waveTab.$wave_height.enable();
    waveTab.$wave_period.enable();

    // conds tab
    controlTab.$shelf_slope.enable();
    controlTab.$shoreface_slope.enable();
    controlTab.$end_year.enable();
    controlTab.$length_timestep.enable();
    controlTab.$save_interval.enable();

    // run tab
    runTab.$runButton.enable();
    runTab.$outputButton.enable();
 }

 function getEndFilterDates() {
    var endYear = this.controlTab.end_year;
    if (endYear >= 2012 && mapInterface.source.name == "LS5") {
        mapInterface.source = sources[1];
    }
    
    var start_date = endYear + "-01-01";
    var end_date = endYear + "-12-01";
    return [start_date, end_date];
 }

/**
 * Save/load functions
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
    mapInterface.setNumRows(gridConfig.numRows);
    mapInterface.setNumCols(gridConfig.numCols);
    mapInterface.map.getView().setRotation(gridConfig.rotation);  
    mapInterface.cemGrid = gridConfig.grid;
    if (gridConfig.points) {
        var points = gridConfig.points;
        mapInterface.updateBox(points[0][0], points[0][1], points[1][0], points[1][1]);
    }
    gridTab.setAllValues();

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
    if (!file) { return; }
    
    // setting up the reader
    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');

    reader.onload = (readerEvent) => {
        var content = readerEvent.target.result;
        importJSON(content)
    };
    this.event.target.value = '';
 }

/**
 * Grid tab view
 */
function GridTab() {
    return {
        $elem: $(".grid-tab"),
        $tab: $("#grid-tab"),
        
        $rotation: $("input[name=rotation]"),
        
        $numRows: $("input[name=numRows]"),       
        $numCols: $("input[name=numCols]"),

        $lon1: $("input[name=lon1]"),
        $lat1: $("input[name=lat1]"),
        $lon2: $("input[name=lon2]"),
        $lat2: $("input[name=lat2]"),
        $coords: $(".coord"),

        $drawButton: $(".draw-button"),
        $submitButton: $(".submit-button"),
        $clearButton: $(".clear-button"),
        $editButton: $(".edit-button"),

        init: function() {
            // add input listeners
            this.$tab.click(() => { onTabChange(this); });
            this.$rotation.change(() => { this.onRotationChange(); });
            this.$numRows.change(() => { this.onNumRowsChange(); });
            this.$numCols.change(() => { this.onNumColsChange(); });
            this.$coords.change(() => { this.onCoordsChange(); });

            // add button listeners
            this.$drawButton.click(() => { this.onDrawClicked(); });
            this.$submitButton.click(() => { this.onSubmitClicked(); });
            this.$clearButton.click(() => { this.onClearClicked(); });
            this.$editButton.click(() => { this.toggleEdit(); });


            $('input[type=radio]').click(function(){
                    mapInterface.source = sources[this.value];
            });
            $('input[type=radio]:first').attr("checked", true);

            // disable buttons
            this.$submitButton.disable();
            this.$clearButton.disable();
            this.$editButton.disable();

            // initialize
            this.setAllValues();
        },
        
        /**
         * click listeners
         */
        onSubmitClicked: function() {
            this.$coords.disable();

            this.$drawButton.disable();
            $loadButton.disable();
            $('input[type=radio]').disable();
            this.$numRows.disable();
            this.$numCols.disable();
            this.$submitButton.disable();

            mapInterface.mapTransform([mapInterface.source.startFilter, mapInterface.source.endFilter], true);
            
            // send to server
            var grid_data = {
                nRows: mapInterface.numRows,
                nCols: mapInterface.numCols,
                polyGrid: mapInterface.polyGrid,
                source: mapInterface.source.name,
                year: mapInterface.source.year,
                geometry: mapInterface.box.getCoordinates()
            }
            socket.emit('submit', grid_data);
            
            this.$editButton.enable();
            runTab.$runButton.enable();
        },

        onClearClicked: function() {
            mapInterface.clearMap();

            this.$rotation.enable();
            this.setRotation();
            this.$coords.val("");
            this.$coords.enable();
            $('input[type=radio]').enable();            
            this.$numRows.enable();
            this.$numCols.enable();
            
            this.$drawButton.enable();
            this.$submitButton.disable();
            this.$editButton.disable();
            this.$clearButton.disable();


            
            $loadButton.enable();
            runTab.$runButton.disable();
            runTab.$outputButton.disable();
            runTab.clearOutput();
        },

        onDrawClicked: function() {
            mapInterface.toggleDrawMode();
        },

        toggleEdit: function() {
            this.$editButton.attr("selected") ? this.$editButton.removeAttr("selected") : this.$editButton.attr("selected", "selected");
            mapInterface.toggleEditMode();
        },

        /**
         * input listeners 
         */
        onCoordsChange: function() {
            var coords = mapInterface.box ? mapInterface.box.getCoordinates()[0] : [["", ""], [], ["", ""]];
            var lon1 = tryParseFloat(this.$lon1.val(), coords[0][0]);
            var lat1 = tryParseFloat(this.$lat1.val(), coords[0][1]);
            var lon2 = tryParseFloat(this.$lon2.val(), coords[2][0]);
            var lat2 = tryParseFloat(this.$lat2.val(), coords[2][1]);

            // if one or more input is empty
            if ($(".coord").toArray().some((e) => { return !($(e).val());})) {
                return;
            }
            mapInterface.updateBox(lon1, lat1, lon2, lat2);
        },

        onNumRowsChange: function() {
            mapInterface.setNumRows(tryParseInt(this.$numRows.val()), mapInterface.numRows);
            if (mapInterface.box) {
                mapInterface.drawGrid();
            }
        },

        onNumColsChange: function() {
            mapInterface.setNumCols(tryParseInt(this.$numCols.val()), mapInterface.numCols);
            if (mapInterface.box) {
                mapInterface.drawGrid();
            }
        },

        onRotationChange: function() {
            mapInterface.map.getView().setRotation(
                deg_to_rad(tryParseFloat(this.$rotation.val()), mapInterface.rotation));
        },

        /**
         * setters
         */        
        setAllValues: function() {
            this.setRotation();
            this.$numRows.val(mapInterface.numRows);
            this.$numCols.val(mapInterface.numCols);
            this.setCoords();
        },        

        setRotation: function() {    
            this.$rotation.val(rad_to_deg(mapInterface.rotation));
        },        

        setCoords: function() {
            if (!mapInterface.box) { return; }
            var coords = mapInterface.box.getCoordinates()[0];
            $("input[name=lon1]").val(coords[0][0]);
            $("input[name=lat1]").val(coords[0][1]);
            $("input[name=lon2]").val(coords[2][0]);
            $("input[name=lat2]").val(coords[2][1]);
        },

        /**
         * map listeners
         */

        onBoxDrawn: function() {
            this.setRotation();
            this.setCoords();
            this.$rotation.disable();
            this.$clearButton.enable();
            this.$submitButton.enable();
        }
    }
}

/**
 * Wave tab view
 */
function WaveTab() {
    return {
        $elem: $(".wave-tab"),
        $tab: $("#wave-tab"),

        $asymmetry: $("input[name=a-input]"),       
        $stability: $("input[name=u-input]"),
        $wave_height: $("input[name=wave-height]"),       
        $wave_period: $("input[name=wave-period]"),

        a_val: null,
        u_val: null,
        wave_height: null,
        wave_period: null,

        init: function() {
            this.$tab.click(() => { onTabChange(this); });
            // init values
            this.a_val = this.$asymmetry.val();
            this.u_val = this.$stability.val();
            this.wave_height = this.$wave_height.val();
            this.wave_period = this.$wave_period.val();
            // attach listeners
            this.$asymmetry.change(() => { this.onAsymmetryChange(); });
            this.$stability.change(() => { this.onStabilityChange(); });
            this.$wave_height.change(() => { this.onWaveHeightChange(); });
            this.$wave_period.change(() => { this.onWavePeriodChange(); });
        },

        /** listeners
         */
        onAsymmetryChange: function() {
            this.a_val = this.$asymmetry.val();
        },

        onStabilityChange: function() {
            this.u_val = this.$stability.val();
        },

        onWaveHeightChange: function() {
            this.wave_height = this.$wave_height.val();
        },

        onWavePeriodChange: function() {
            this.wave_period = this.$wave_period.val();
        }

    }
}

/**
* Controls tab view
*/
function ControlsTab() {
    return {
        $elem: $(".control-tab"),
        $tab: $("#control-tab"),

        $shelf_slope: $("input[name=shelf-slope]"),
        $shoreface_slope: $("input[name=shoreface-slope]"),
        $end_year: $("input[name=end-date]"),
        $length_timestep: $("input[name=timestep]"),
        $save_interval: $("input[name=save-interval]"),

        shelf_slope: null,
        shoreface_slope: null,
        end_year: null,
        length_timestep: null,
        save_interval: null,
        num_timesteps: null,

        init: function() {
            this.$tab.click(() => { onTabChange(this); });
            // init values
            this.shelf_slope = this.$shelf_slope.val();
            this.shoreface_slope = this.$shoreface_slope.val();
            this.end_year = this.$end_year.val();
            this.length_timestep = this.$length_timestep.val();
            this.save_interval = this.$save_interval.val();
            // attach listeners
            this.$shelf_slope.change(() => { this.onShelfSlopeChange(); });
            this.$shoreface_slope.change(() => { this.onShorefaceSlopeChange(); });
            this.$end_year.change(() => { this.onEndYearChange(); });
            this.$length_timestep.change(() => { this.onTimestepLengthChange(); });
            this.$save_interval.change(() => { this.onSaveIntervalChange(); });
            this.getNumTimesteps();
        },

        getNumTimesteps: function() {
            this.num_timesteps = parseInt(Math.round((this.end_year - mapInterface.source.year) * (365/this.length_timestep)))
        },

        /** listeners
         */
        onShelfSlopeChange: function() {
            this.shelf_slope = this.$shelf_slope.val();
        },

        onShorefaceSlopeChange: function() {
            this.shoreface_slope = this.$shoreface_slope.val();
        },

        onEndYearChange: function() {
            this.end_year = this.$end_year.val();
            this.getNumTimesteps();
            runTab.displayTimestep(0);
        },

        onTimestepLengthChange: function() {
            this.length_timestep = this.$length_timestep.val();
        },

        onSaveIntervalChange: function() {
            this.save_interval = this.$save_interval.val();
        }
    }
}

/**
 * Run tab view
 */
function RunTab() {
    return {
        $elem: $(".run-tab"),
        $tab: $("#run-tab"),
        
        $output: $(".output-pane"),
        $timestep: $(".timestep"),
        $runButton: $(".run-button"),
        $outputButton: $(".output-button"),

        init: function() {
            this.$tab.click(() => { onTabChange(this); });
            this.$runButton.click(() => { onRun(); });

            this.$runButton.disable();
            this.$outputButton.disable();

            this.displayTimestep(0);
        },

        updateOutput: function(msg) {
            var text = this.$output.text();
            text += msg.time + ": " + (100*msg.dif).toFixed(4) + "\n";
            this.$output.text(text);
        },

        clearOutput: function() {
            this.$output.text("");
        },

        displayTimestep: function(t) {
            this.$timestep.text("T = " + t + " out of " + controlTab.num_timesteps);
        }
    }
}

/**
 * Modal window
 */
 function ModalInterface() {
    return {
        $modal: $(".modal"),
        $fillInput: $("input[name=fill]"),
        $cell: $(".cell"),

        feature: null,
        percentFull: 0,

        init: function() {
            // set up listeners
            this.$fillInput.change(() => {
                this.setFill();
                this.display();
            });
            this.$modal.find(".modal-ok-button").click(() => { this.onOkClicked(); } );
            this.$modal.find(".modal-cancel-button").click(() => { this.onCancelClicked() });
        },

        open: function(feature) {
            this.feature = feature;
            this.$fillInput.val(feature.get("fill")*100);
            this.setFill();
            this.display();
            this.$modal.show();
        },

        setFill: function() {
            this.percentFull = this.$fillInput.val();
        },

        display: function() {
            this.$cell.empty();
            var $cellFull = $("<div class='cell-full'></div>");
            var $cellEmpty = $("<div class='cell-empty'></div>");

            var styleFull = {
                "height": "" + this.percentFull + "%",
                "width": "100%"
            }
            var styleEmpty = {
                "height": "" + (100-this.percentFull) + "%",
                "width": "100%"
            }


            $cellEmpty.css(styleEmpty).css({"float":"left"}).appendTo(this.$cell);
            $cellFull.css(styleFull).css({"float":"right"}).appendTo(this.$cell);
        },

        save: function() {
            var i = this.feature.get('id');
            mapInterface.cemGrid[i] = this.percentFull/100;
            mapInterface.updateFeature(this.feature, this.percentFull/100);
        },

        close: function() {
            this.feature = null;
            this.$modal.hide();
        },

        /**
         * Listeners
         */        
        onOkClicked: function() {
            // save changes
            this.save();
            this.close();
        },

        onCancelClicked: function() {
            this.close();
        }
    };
}

