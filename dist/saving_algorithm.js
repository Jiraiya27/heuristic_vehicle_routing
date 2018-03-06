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
var fs = require("fs");
var path = require("path");
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
var totalDistanceAll = 0;
allRoutes.map(function (route) {
    totalDistanceAll += route.totalDistance;
    return;
});
console.log('All Routes Total Distance:', totalDistanceAll);
fs.writeFileSync(path.resolve(__dirname, '../client/test_files/allRoutes.json'), JSON.stringify(allRoutes));
var swappedWithin = withinTourInsertion(allRoutes, savingsJSON);
var totalDistanceSwapped = 0;
swappedWithin.map(function (route) {
    totalDistanceSwapped += route.finalDistance;
});
console.log('Within Swapped Total Distance:', totalDistanceSwapped);
// console.log('Swapped Within:', swappedWithin)
fs.writeFileSync(path.resolve(__dirname, '../client/test_files/swappedWithin.json'), JSON.stringify(swappedWithin));
var noOfVehicles = allRoutes.length;
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
    // console.log('Incomplete Routes:', incompleteRoutes)
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
function withinTourInsertion(vehicles, fullSavingsTable) {
    return vehicles.map(function (vehicle) {
        var totalLength = vehicle.route.length;
        var totalDistance = vehicle.totalDistance;
        // no swap for single destination routes
        if (totalLength === 2)
            return vehicle;
        // make a single array excluding depot_id
        var sequence = flattenRouteWithoutDepot(vehicle.route);
        // console.log('Sequence:', sequence)
        // console.log('Total Distance:', totalDistance)
        // swap for half of total possibilities
        // redo if found better solution
        // TODO: rename current distance to original distance and distance -> currentDistance
        var currentCount = 0;
        var currentDistance = totalDistance;
        var distance = totalDistance;
        var routes = [];
        var maxSwapTimes = Math.floor(sequence.length * (sequence.length - 1) / 4);
        while (currentCount < maxSwapTimes) {
            (_a = swapRouteWithin(sequence, currentCount, distance), routes = _a.routes, currentCount = _a.currentCount, distance = _a.distance);
            // console.log('Current Count:', currentCount)
            // console.log('Current Distance:', currentDistance)
            // console.log('Routes:', routes)
            // console.log('Distance:', distance)
            // console.log('=============================================')
        }
        // console.log('Current Count:', currentCount)
        // console.log('Current Distance:', currentDistance)
        // console.log('Routes:', routes)
        // console.log('Distance:', distance)
        return {
            originalRoute: sequence,
            finalRoute: routes,
            originalDistance: currentDistance,
            finalDistance: distance
        };
        var _a;
    });
}
function swapRouteWithin(routes, currentCount, currentDistance) {
    var maxSwapTimes = Math.floor(routes.length * (routes.length - 1) / 4);
    for (var i = 0; i < routes.length - 1; i++) {
        for (var j = 1; j < routes.length; j++) {
            // exceed maxSwap, return
            if (currentCount > maxSwapTimes) {
                i = routes.length;
                break;
            }
            // swap and add back depot into routes
            // compare new route's distance
            // break if lower than currentDistance
            var swappedRoute = swap(routes, routes[i], routes[j]);
            swappedRoute.unshift(config_1.DEPOT_ID);
            swappedRoute.push(config_1.DEPOT_ID);
            var distance = findRouteDistance(swappedRoute);
            // console.log('Distance:', distance)
            if (distance < currentDistance) {
                return {
                    routes: swappedRoute,
                    currentCount: ++currentCount,
                    distance: distance
                };
            }
            currentCount++;
        }
    }
    return {
        routes: routes,
        currentCount: currentCount,
        distance: currentDistance
    };
}
function swap(route, valueA, valueB) {
    return route.map(function (value) {
        if (value === valueA)
            return valueB;
        if (value === valueB)
            return valueA;
        return value;
    });
}
function findRouteDistance(route) {
    var distance = 0;
    // console.log('Route:', route)
    for (var i = 0; i < route.length - 1; i++) {
        distance += findDistance(route[i], route[i + 1]);
    }
    return distance;
}
// TODO: Refactor other find distances with this function
function findDistance(point1, point2) {
    if (point2 < point1) {
        var temp = point1;
        point1 = point2;
        point2 = temp;
    }
    var index = (point1 - 1) * config_1.TOTAL_NODES + point2 - 1;
    // if (!savingsJSON[index].Total_Length) {
    //   console.log('Savings JSON at index:', savingsJSON[index])
    //   console.log(index)
    //   console.log(point1)
    //   console.log(point2)
    // }
    if (!savingsJSON[index]) {
        console.log("Can't find index:", index);
    }
    // TEMP FIX: value of 0 equals undefined in JSON
    // ID 85 and 86 are same location which gives 0 casuing the bug
    // look into a way for actually having 0 as value
    return savingsJSON[index].Total_Length || 0;
}
function flattenRouteWithoutDepot(route) {
    // make a single array excluding depot_id
    return route.map(function (_a) {
        var _ = _a[0], num2 = _a[1];
        if (num2 === config_1.DEPOT_ID)
            return null;
        return num2;
    }).filter(function (num) { return num; });
}
// function populateWeightToDestination(sequence: number[]) {
//   return sequence.map(id => {
//     return {
//       id,
//       weight:
//     }
//   })
// }
// TODO: Accept param for maxSwapTimes
// Defaults to max
function relocate(vehicles) {
    var maxSwapTimes = Math.floor(vehicles.length * (vehicles.length - 1) / 4);
    var swapTimes = 0;
    baseVehicleLoop: 
    // base vehicle to swap
    for (var i = 0; i < vehicles.length - 1; i++) {
        var sequence = flattenRouteWithoutDepot(vehicles[i].route);
        var baseVehicle = __assign({}, vehicles[i], { sequence: sequence });
        // each destination excluding DEPOT
        for (var j = 0; j < sequence.length; j++) {
            // remove ID to put in other vehicle
            var relocationBaseID = sequence.splice(j, 1)[0];
            // the rest of the vehicles
            for (var k = i + 1; k < vehicles.length; k++) {
                var destinationSequence = flattenRouteWithoutDepot(vehicles[k].route);
                // each destination in other vehicles
                for (var l = 0; l <= destinationSequence.length; l++) {
                    // stop when exceeded
                    if (swapTimes > maxSwapTimes) {
                        i = vehicles.length;
                        break baseVehicleLoop;
                    }
                    // relocate destination from base vehicle to another vehicle
                    // const relocateID = sequence.splice(j, 1)[0]
                    // destinationSequence.unshift(relocateID)
                    // compare if total distance of both routes are less than before swap
                }
            }
        }
    }
}
//# sourceMappingURL=saving_algorithm.js.map