"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var XLSX = require("xlsx");
var lodash_1 = require("lodash");
var config_1 = require("./config");
var savingsWB = XLSX.readFile(config_1.SAVINGS_OUTPUT_PATH);
var savingsJSON = XLSX.utils.sheet_to_json(savingsWB.Sheets['1'], { raw: true });
var scheduleWB = XLSX.readFile(config_1.SCHEDULE_ORDER_PATH);
var day1JSON = XLSX.utils.sheet_to_json(scheduleWB.Sheets['1'], { raw: true });
var _a = formatSchedule(day1JSON, { sum: true }), vertices = _a.vertices, schedule = _a.schedule;
var savingsTable = calculateSavingsTable(vertices, savingsJSON);
// === TEST ===
var savingsTableSheet = XLSX.utils.json_to_sheet(savingsTable);
var savingsTableWB = {
    SheetNames: ['1'],
    Sheets: { '1': savingsTableSheet }
};
XLSX.writeFile(savingsTableWB, 'new_files/savings_table_1.xlsx');
// === TEST ===
var allRoutes = calculateAllRoutes(savingsTable, schedule, savingsJSON);
console.log('All Routes:', allRoutes);
function formatSchedule(schedule, _a) {
    var sum = (_a === void 0 ? { sum: false } : _a).sum;
    var scheduleObject = {};
    if (sum) {
        var vertices_1 = schedule.map(function (_a) {
            var No = _a.No, KG = _a.KG;
            if (KG === 0)
                return undefined;
            if (scheduleObject[No]) {
                scheduleObject[No] = { totalKG: scheduleObject[No].totalKG + KG, remainingKG: scheduleObject[No].totalKG + KG };
            }
            else {
                scheduleObject[No] = { totalKG: KG, remainingKG: KG };
            }
            return No;
            // remove duplicate after sum
        }).filter(function (no, index, array) { return array.indexOf(no) === index && no !== undefined; });
        return { vertices: vertices_1, schedule: scheduleObject };
    }
    else {
        var vertices_2 = schedule.map(function (_a) {
            var No = _a.No, KG = _a.KG;
            scheduleObject[No] = { totalKG: KG, remainingKG: KG };
            return No;
        });
        return { vertices: vertices_2, schedule: scheduleObject };
    }
}
function calculateSavingsTable(vertices, savingsJSON) {
    // sort ascending order
    vertices = vertices.sort(function (a, b) { return a - b; });
    var savingsTable = [];
    for (var i = 0; i <= vertices.length; i++) {
        for (var j = i + 1; j <= vertices.length - 1; j++) {
            var rowIndex = (vertices[i] - 1) * config_1.TOTAL_NODES + vertices[j] - 1;
            savingsTable.push(__assign({}, savingsJSON[rowIndex]));
        }
    }
    return lodash_1.orderBy(savingsTable, ['Savings_Cost'], ['desc']);
}
function calculateAllRoutes(table, schedule, fullSavingsTable) {
    var allRoutes = [];
    var incompleteRoutes = [];
    // loop to eliminate all routes with weight > max
    Object.keys(schedule).map(function (key) {
        var destinationRequirement = schedule[Number(key)];
        while (destinationRequirement.remainingKG > config_1.MAX_VEHICLE_WEIGHT) {
            // console.log('Key:', key, 'Remaining:', destinationRequirement.remainingKG)
            // console.log((Number(key) - 1) * TOTAL_NODES + DEPOT_ID - 1)
            var depotDistance = fullSavingsTable[(Number(key) - 1) * config_1.TOTAL_NODES + config_1.DEPOT_ID - 1].Total_Length;
            var oneDestinationRoute = {
                front: Number(key),
                back: Number(key),
                route: [[config_1.DEPOT_ID, Number(key)], [Number(key), config_1.DEPOT_ID]],
                totalDistance: depotDistance * 2,
                weightAvailable: 0,
            };
            allRoutes.push(oneDestinationRoute);
            destinationRequirement.remainingKG -= config_1.MAX_VEHICLE_WEIGHT;
        }
    });
    // check incomplete routes when possible
    // consider only cases that weigth a + b < max, otherwise skip
    // make routes open-ended
    table.map(function (row) {
        var origin = schedule[row.OriginID];
        var destination = schedule[row.DestinationID];
        var rowCompleted = false;
        // check in incomplete routes
        incompleteRoutes.map(function (route) {
            // console.log('Route:', route)
            if (route.front == row.OriginID && route.back !== row.DestinationID) {
                // console.log('Route.front:', route.front, 'row.OriginID:', row.OriginID)
                if (route.weightAvailable > destination.remainingKG && destination.remainingKG !== 0) {
                    route.front = row.DestinationID;
                    route.route.unshift([row.DestinationID, row.OriginID]);
                    route.totalDistance += row.Total_Length;
                    route.weightAvailable -= destination.remainingKG;
                    rowCompleted = true;
                    if (origin.remainingKG !== 0) {
                        console.log('Origin remaining !== 0', origin.remainingKG);
                    }
                    destination.remainingKG = 0;
                }
            }
            else if (route.front == row.DestinationID && route.back !== row.OriginID) {
                if (route.weightAvailable > origin.remainingKG && origin.remainingKG !== 0) {
                    route.front = row.OriginID;
                    route.route.unshift([row.OriginID, row.DestinationID]);
                    route.totalDistance += row.Total_Length;
                    route.weightAvailable -= origin.remainingKG;
                    rowCompleted = true;
                    if (destination.remainingKG !== 0) {
                        console.log('destination remaining !== 0', destination.remainingKG);
                    }
                    origin.remainingKG = 0;
                }
            }
            else if (route.back == row.OriginID && route.front !== row.DestinationID) {
                if (route.weightAvailable > destination.remainingKG && destination.remainingKG !== 0) {
                    route.back = row.DestinationID;
                    route.route.push([row.OriginID, row.DestinationID]);
                    route.totalDistance += row.Total_Length;
                    route.weightAvailable -= destination.remainingKG;
                    rowCompleted = true;
                    if (origin.remainingKG !== 0) {
                        console.log('Origin remaining !== 0', origin.remainingKG);
                    }
                    destination.remainingKG = 0;
                }
            }
            else if (route.back == row.DestinationID && route.front !== row.OriginID) {
                if (route.weightAvailable > origin.remainingKG && origin.remainingKG !== 0) {
                    route.back = row.OriginID;
                    route.route.push([row.DestinationID, row.OriginID]);
                    route.totalDistance += row.Total_Length;
                    route.weightAvailable -= origin.remainingKG;
                    rowCompleted = true;
                    if (destination.remainingKG !== 0) {
                        console.log('destination remaining !== 0', destination.remainingKG);
                    }
                    origin.remainingKG = 0;
                }
            }
            return route;
        });
        // appended to an incomplete route
        if (rowCompleted)
            return row;
        // can't send if exceed
        if (origin.remainingKG + destination.remainingKG > config_1.MAX_VEHICLE_WEIGHT)
            return row;
        // already sent to 1 of them
        if (origin.remainingKG === 0 || destination.remainingKG === 0)
            return row;
        // Create new route and add to incomplete routes
        var newRoute = {
            front: row.OriginID,
            back: row.DestinationID,
            route: [[row.OriginID, row.DestinationID]],
            totalDistance: row.Total_Length,
            weightAvailable: config_1.MAX_VEHICLE_WEIGHT - origin.remainingKG - destination.remainingKG
        };
        origin.remainingKG = 0;
        destination.remainingKG = 0;
        incompleteRoutes.push(newRoute);
        // console.log('Incomplete routes:', incompleteRoutes)
        return row;
    });
    console.log('Incomplete Routes:', incompleteRoutes);
    // calculate distances and finish off all incomplete routes
    // add all incomplete(now completed routes to all routes)
    incompleteRoutes.map(function (route) {
        route.route.unshift([config_1.DEPOT_ID, route.front]);
        route.route.push([route.back, config_1.DEPOT_ID]);
        var frontDepotDistance = fullSavingsTable[(route.front - 1) * config_1.TOTAL_NODES + config_1.DEPOT_ID - 1].Total_Length;
        var backDepotDistance = fullSavingsTable[(route.back - 1) * config_1.TOTAL_NODES + config_1.DEPOT_ID - 1].Total_Length;
        route.totalDistance += frontDepotDistance + backDepotDistance;
        return route;
    });
    allRoutes = allRoutes.concat(incompleteRoutes);
    // finish off the rest of the routes (similar to 1)
    Object.keys(schedule).map(function (key) {
        var destinationRequirement = schedule[Number(key)];
        if (destinationRequirement.remainingKG !== 0) {
            var depotDistance = fullSavingsTable[(Number(key) - 1) * config_1.TOTAL_NODES + config_1.DEPOT_ID - 1].Total_Length;
            var oneDestinationRoute = {
                front: Number(key),
                back: Number(key),
                route: [[config_1.DEPOT_ID, Number(key)], [Number(key), config_1.DEPOT_ID]],
                totalDistance: depotDistance * 2,
                weightAvailable: config_1.MAX_VEHICLE_WEIGHT - destinationRequirement.remainingKG,
            };
            allRoutes.push(oneDestinationRoute);
            destinationRequirement.remainingKG = 0;
        }
    });
    return allRoutes;
}
//# sourceMappingURL=saving_algorithm.js.map