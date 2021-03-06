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
        $cellSize: $(".cell-dimensions"),

        $lon1: $("input[name=lon1]"),
        $lat1: $("input[name=lat1]"),
        $lon2: $("input[name=lon2]"),
        $lat2: $("input[name=lat2]"),
        $coords: $(".coord"),
        $start_year: $("input[name=start-date]"),

        $drawButton: $(".draw-button"),
        $submitButton: $(".submit-button"),
        $clearButton: $(".clear-button"),
        $editButton: $(".edit-button"),
        $exportButton: $(".export-button"),

        source: -1,
        start_year: 1985,

        shoreline: [],

        init: function() {
            // add input listeners
            this.$tab.click(() => { onTabChange(this); });
            this.$rotation.change(() => { this.onRotationChange(); });
            this.$numRows.change(() => { this.onNumRowsChange(); });
            this.$numCols.change(() => { this.onNumColsChange(); });
            this.$coords.change(() => { this.onCoordsChange(); });
            this.$start_year.change(() => { this.onStartYearChange(); });

            // add button listeners
            this.$drawButton.click(() => { this.onDrawClicked(); });
            this.$submitButton.click(() => { this.onSubmitClicked(); });
            this.$clearButton.click(() => { this.onClearClicked(); });
            this.$editButton.click(() => { this.toggleEdit(); });
            this.$exportButton.click(() => { this.exportGrid(); });

            $('input[type=radio][name=source]').click(($elem) => {
                    this.source = tryParseInt($elem.target.value, -1);
            });
            $('input[type=radio][name=source]:first').attr("checked", true);

            // disable buttons
            this.$submitButton.disable();
            this.$clearButton.disable();
            this.$editButton.disable();
            this.$exportButton.disable();

            // initialize
            this.setAllValues();
        },
        
        /*****************
         * click listeners
         *****************/
        onSubmitClicked: function() {
            this.onSubmitStart();

            // create payload
            var map_input = {
                nRows: mapInterface.numRows,
                nCols: mapInterface.numCols,
                rowSize: mapInterface.getRowSize(),
                colSize: mapInterface.getColSize(),
                geometry: mapInterface.box.getCoordinates(),
                rotation: mapInterface.rotation,
                source: this.source,
                start: this.start_year,
            };

            // validate payload 
            if (validateMapData(map_input) == 0) {
                // send request
                $.post('/request-shoreline', {
                    type: "json",
                    input_data: JSON.stringify(map_input)
                }).done((resp) => {
                    try {
                        resp = JSON.parse(resp);
                        if (resp.status != 200) {
                            throw(new Error(resp.message))
                        }
                    } catch (err){
                        gridTab.onSubmitFail();
                        showErrorMessage(err.message);
                        return;
                    }
                    // draw grid
                    if (resp.grid.length > 0) {
                        var grid = mapInterface.makeGrid(resp.grid);
                        mapInterface.updateDisplay(grid);
                    }
                    // draw shoreline                    
                    if (resp.latlon.length > 0) {
                        this.shoreline = resp.latlon;
                        mapInterface.displayShoreline(mapInterface.refShoreline, this.shoreline);
                    }


                    gridTab.onSubmitSuccess();
                }).fail((err) => {
                    gridTab.onSubmitFail();
                    showErrorMessage(JSON.parse(err.responseText).message);
                });
            } else {
                gridTab.onSubmitFail();
                showErrorMessage("One or more inputs are invalid.");
            }
        },

        onSubmitStart: function() {
            this.$rotation.disable();
            this.$coords.disable();
            this.$drawButton.disable();
            $loadButton.disable();
            $('input[type=radio][name=source]').disable();
            this.$numRows.disable();
            this.$numCols.disable();
            this.$submitButton.disable();
            this.$clearButton.disable();
            this.$start_year.disable();   
        },

        onSubmitFail: function() {
            this.$rotation.enable();
            this.$coords.enable();
            this.$drawButton.enable();
            $loadButton.enable();
            $('input[type=radio][name=source]').enable();
            this.$numRows.enable();
            this.$numCols.enable();
            this.$submitButton.enable();
            this.$clearButton.enable();
            this.$start_year.enable();   
        },

        onSubmitSuccess: function() {   
            this.$editButton.enable();
            this.$exportButton.enable();
            this.$clearButton.enable();
            runTab.$runButton.enable();
        },

        onClearClicked: function() {
            mapInterface.clearMap();
            this.setCoords();
            this.onCoordsChange();

            this.$rotation.enable();
            this.setRotation();
            this.$coords.enable();
            $('input[type=radio][name=source]').enable();            
            this.$numRows.enable();
            this.$numCols.enable();
            this.$start_year.enable();

            this.$drawButton.enable();
            this.$submitButton.disable();
            this.$editButton.disable();
            this.$clearButton.disable();
            this.$exportButton.disable();
            
            $loadButton.enable();
            runTab.$runButton.disable();
            runTab.$outputButton.disable();
            runTab.clearOutput();

            this.shoreline = [];
        },

        onDrawClicked: function() {
            mapInterface.toggleDrawMode();
        },

        toggleEdit: function() {
            this.$editButton.attr("selected") ? this.$editButton.removeAttr("selected") : this.$editButton.attr("selected", "selected");
            mapInterface.toggleEditMode();
        },        

        exportGrid: function() {
            var a = document.createElement("a");
            var content = "data:text/csv;charset=utf-8,";
            // write nRows and nCols
            content += mapInterface.numRows + ", " + mapInterface.numCols + "\n";
            // write row size and col size
            content += mapInterface.getRowSize() + ", " + mapInterface.getColSize() + "\n";
            // write box coords (top left, clockwise), lat, lon
            coords = mapInterface.box.getCoordinates()[0];
            content += "lat, lon\n";
            content += coords[0][1] + ", " + coords[0][0] + "\n";
            content += coords[1][1] + ", " + coords[1][0] + "\n";
            content += coords[2][1] + ", " + coords[2][0] + "\n";
            content += coords[3][1] + ", " + coords[3][0] + "\n";
            // write grid
            content += mapInterface.cemGrid.map(e => e.join(",")).join("\n");
            // write shoreline coords
            content += "\nshoreline coordinates\n"
            content += this.shoreline.join(",");
            a.href = encodeURI(content);
            a.download = "grid.txt";
            a.click();
        },

        /*****************
         * input listeners 
         *****************/
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
                this.$cellSize.text("Cell size: " + mapInterface.getRowSize().toFixed(3) + "m x " + mapInterface.getColSize().toFixed(3) + "m");
            }
        },

        onRotationChange: function() {
            mapInterface.map.getView().setRotation(
                deg_to_rad(tryParseFloat(this.$rotation.val()), mapInterface.rotation));
        },

        onStartYearChange: function() {
            this.start_year = tryParseInt(this.$start_year.val());
            controlTab.getNumTimesteps();
            runTab.displayTimestep(0);
        },

        /*********
         * setters
         *********/        
        setAllValues: function() {
            this.setRotation();
            this.$numRows.val(mapInterface.numRows);
            this.$numCols.val(mapInterface.numCols);
            this.setCoords();            
            $("input[type=radio][name=source][value=" + this.source + "]").attr("checked", true);
            this.$start_year.val(this.start_year);
        },        

        setRotation: function() {    
            this.$rotation.val(rad_to_deg(mapInterface.rotation));
        },        

        setCoords: function() {
            if (!mapInterface.box) { 
                $("input[name=lon1]").val("");
                $("input[name=lat1]").val("");
                $("input[name=lon2]").val("");
                $("input[name=lat2]").val("");
                return;
            }
            var coords = mapInterface.box.getCoordinates()[0];
            $("input[name=lon1]").val(coords[0][0]);
            $("input[name=lat1]").val(coords[0][1]);
            $("input[name=lon2]").val(coords[2][0]);
            $("input[name=lat2]").val(coords[2][1]);
        },

        /***************
         * map listeners
         ***************/
        onBoxDrawn: function() {
            this.setRotation();
            this.setCoords();
            this.$rotation.disable();
            this.$clearButton.enable();
            this.$submitButton.enable();
        },

        onGridDrawn: function() {            
            this.$cellSize.text("Cell size: " + mapInterface.getRowSize().toFixed(3) + "m x " + mapInterface.getColSize().toFixed(3) + "m");
        }
    }
}