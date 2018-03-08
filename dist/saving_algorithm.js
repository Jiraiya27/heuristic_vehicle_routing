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
var Mode;
(function (Mode) {
    Mode[Mode["Normal"] = 0] = "Normal";
    Mode[Mode["SimulatedAnneling"] = 1] = "SimulatedAnneling";
    Mode[Mode["TabuSearch"] = 2] = "TabuSearch";
})(Mode || (Mode = {}));
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
var swapOptions = {
    mode: Mode.Normal,
};
var swappedWithin = withinTourInsertion(allRoutes, swapOptions, savingsJSON);
var totalDistanceSwapped = 0;
swappedWithin.map(function (route) {
    totalDistanceSwapped += route.finalDistance;
});
console.log('Within Swapped Total Distance:', totalDistanceSwapped);
console.log('Swapped Within:', swappedWithin);
fs.writeFileSync(path.resolve(__dirname, '../client/test_files/swappedWithin.json'), JSON.stringify(swappedWithin));
var relocated = relocate(allRoutes);
var totalDistanceRelocated = 0;
relocated.map(function (route) {
    totalDistanceRelocated += route.newTotalDistance || route.totalDistance;
});
console.log('Relocated Swap Total Distance:', totalDistanceRelocated);
console.log('Relocated:', relocated);
fs.writeFileSync(path.resolve(__dirname, '../client/test_files/relocated.json'), JSON.stringify(relocated));
var exchanged = exchange(allRoutes);
var totalDistanceExchanged = 0;
exchanged.map(function (route) {
    totalDistanceExchanged += route.newTotalDistance || route.totalDistance;
});
console.log('Exchanged Total Distance:', totalDistanceExchanged);
console.log('Exchanged:', exchanged);
fs.writeFileSync(path.resolve(__dirname, '../client/test_files/exchanged.json'), JSON.stringify(exchanged));
var test1 = findRouteDistance([config_1.DEPOT_ID, 199, 49, 73, config_1.DEPOT_ID]);
var test2 = findRouteDistance([config_1.DEPOT_ID, 73, 49, 199, config_1.DEPOT_ID]);
console.log('Test1:', test1);
console.log('Test2:', test2);
// for (let i = 0; i < allRoutes.length; i++) {
//   const allRouteTotalDistance = allRoutes[i].totalDistance
//   const exchangedTotalDistance = exchanged[i].newTotalDistance || exchanged[i].totalDistance
//   if (allRouteTotalDistance === exchangedTotalDistance) console.log('Index:', i, 'EQUAL')
//   else if (allRouteTotalDistance < exchangedTotalDistance) {
//     console.log('Index:', i, 'ALL ROUTE')
//     console.log('All Route:', allRouteTotalDistance)
//     console.log('Exchanged:', exchangedTotalDistance)
//   }
//   else if (allRouteTotalDistance > exchangedTotalDistance) {
//     console.log('Index:', i, 'EXCHANGED')
//     console.log('All Route:', allRouteTotalDistance)
//     console.log('Exchanged:', exchangedTotalDistance)
//   }
// }
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
// TODO: Return as an additional field to existing ROute[] or as a new type
function withinTourInsertion(vehicles, options, fullSavingsTable) {
    return vehicles.map(function (vehicle) {
        var totalLength = vehicle.route.length;
        var totalDistance = vehicle.totalDistance;
        // make a single array excluding depot_id
        var sequence = flattenRouteWithoutDepot(vehicle.route);
        // no swap for single destination routes
        if (totalLength === 2) {
            // return vehicle
            return {
                originalRoute: sequence,
                finalRoute: sequence,
                originalDistance: totalDistance,
                finalDistance: totalDistance
            };
        }
        // swap for half of total possibilities
        // redo if found better solution
        // TODO: rename current distance to original distance and distance -> currentDistance
        var currentCount = 0;
        var currentDistance = totalDistance;
        var distance = totalDistance;
        var routes = sequence;
        var tabuList = [];
        var maxSwapTimes = Math.floor(sequence.length * (sequence.length - 1) / 4);
        while (currentCount < maxSwapTimes) {
            (_a = swapRouteWithin(routes, currentCount, distance, options), routes = _a.routes, currentCount = _a.currentCount, distance = _a.distance, tabuList = _a.tabuList);
            options.tabuList = tabuList;
        }
        return {
            originalRoute: sequence,
            finalRoute: routes,
            originalDistance: currentDistance,
            finalDistance: distance
        };
        var _a;
    });
}
function swapRouteWithin(routes, currentCount, currentDistance, options) {
    var maxSwapTimes = Math.floor(routes.length * (routes.length - 1) / 4);
    var annelingProb = options.annelingProb || 0.2;
    var tabuTenure = options.tabuTenure || 10;
    var tabuList = options.tabuList || [];
    for (var i = 0; i < routes.length - 1; i++) {
        var _loop_1 = function (j) {
            // exceed maxSwap, return
            if (currentCount > maxSwapTimes) {
                i = routes.length;
                return "break";
            }
            // TS mode
            if (options.mode === Mode.TabuSearch) {
                var num1_1 = routes[i];
                var num2_1 = routes[j];
                var skip_1 = false;
                tabuList = tabuList.map(function (item) {
                    // if in list, skip it
                    if (item.pair === [num1_1, num2_1] || item.pair === [num2_1, num1_1]) {
                        skip_1 = true;
                    }
                    // decrement
                    item.turnsLeft -= 1;
                    // remove if expired
                    if (item.turnsLeft < 1) {
                        return null;
                    }
                    else {
                        return item;
                    }
                }).filter(function (item) { return item; });
                // if in tabu list, skip this round
                if (skip_1) {
                    currentCount++;
                    return "continue";
                }
            }
            // swap and add back depot into routes
            // compare new route's distance
            // break if lower than currentDistance
            var swappedRoute = swap(routes, routes[i], routes[j]);
            var distance = findRouteDistance([config_1.DEPOT_ID].concat(swappedRoute, [config_1.DEPOT_ID]));
            if (distance < currentDistance) {
                // if in tabu mode, insert pair into List
                if (options.mode === Mode.TabuSearch) {
                    var tabuItem = {
                        pair: [routes[i], routes[j]],
                        turnsLeft: tabuTenure
                    };
                    tabuList.push(tabuItem);
                    return { value: {
                            routes: swappedRoute,
                            currentCount: ++currentCount,
                            distance: distance,
                            tabuList: tabuList,
                        } };
                }
                return { value: {
                        routes: swappedRoute,
                        currentCount: ++currentCount,
                        distance: distance
                    } };
                // if SA mode then chance to use the worsened route
            }
            else if (options.mode === Mode.SimulatedAnneling) {
                var random = Math.random(); // 0 - 0.999...
                if (random < annelingProb) {
                    return { value: {
                            routes: swappedRoute,
                            currentCount: ++currentCount,
                            distance: distance
                        } };
                }
            }
            currentCount++;
        };
        for (var j = i + 1; j < routes.length; j++) {
            var state_1 = _loop_1(j);
            if (typeof state_1 === "object")
                return state_1.value;
            if (state_1 === "break")
                break;
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
function populateWeightToSequence(sequence) {
    return sequence.map(function (id) {
        var weight = schedule[id].totalKG % config_1.MAX_VEHICLE_WEIGHT;
        return {
            id: id,
            weight: weight,
        };
    });
}
// TODO: Accept param for maxSwapTimes
// TODO: Defaults to max
// NOTE:Relocate success = go to next base vehicle's destination
function relocate(vehicles) {
    var maxSwapTimes = Math.floor(vehicles.length * (vehicles.length - 1) / 4);
    var swapTimes = 0;
    baseVehicleLoop: 
    // base vehicle to swap
    for (var i = 0; i < vehicles.length - 1; i++) {
        var sequence = vehicles[i].newSequence || flattenRouteWithoutDepot(vehicles[i].route);
        var sequenceWithWeight = populateWeightToSequence(sequence);
        var baseVehicle = __assign({}, vehicles[i], { sequence: sequence });
        // skip over if length is 1 
        if (sequence.length === 1)
            continue;
        // each destination excluding DEPOT
        for (var j = 0; j < sequence.length; j++) {
            // base vehicle distance can be changed after each destination ID
            // therefore place in inner loop
            var baseVehicleDistance = baseVehicle.newTotalDistance || baseVehicle.totalDistance;
            // remove ID to put in other vehicle
            var baseSequenceCopy = sequence.slice();
            var relocationBaseID = baseSequenceCopy.splice(j, 1)[0];
            var removedBasedDistance = findRouteDistance([config_1.DEPOT_ID].concat(baseSequenceCopy, [config_1.DEPOT_ID]));
            // the rest of the vehicles
            restOfVehiclesLoop: for (var k = i + 1; k < vehicles.length; k++) {
                var destinationSequence = vehicles[k].newSequence || flattenRouteWithoutDepot(vehicles[k].route);
                // let destinationSequenceWithWeight = populateWeightToSequence(destinationSequence)
                var destinationDistance = vehicles[k].newTotalDistance || vehicles[k].totalDistance;
                var destinationWeightAvailable = vehicles[k].newWeightAvailable || vehicles[k].weightAvailable;
                // skip over if length is 1 
                if (sequence.length === 1)
                    continue;
                // relocate if destination vehicle can afford
                if (sequenceWithWeight[j].weight < destinationWeightAvailable) {
                    // each destination in other vehicles
                    // conclusive of last position after last existing destination
                    for (var l = 0; l <= destinationSequence.length; l++) {
                        // stop when exceeded
                        if (swapTimes > maxSwapTimes) {
                            i = vehicles.length;
                            break baseVehicleLoop;
                        }
                        // insert relocation ID
                        var relocatedDestinationSequence = destinationSequence.slice();
                        relocatedDestinationSequence.splice(l, 0, relocationBaseID);
                        // compare whether new weight is better or not
                        var newDestinationDistance = findRouteDistance([config_1.DEPOT_ID].concat(relocatedDestinationSequence, [config_1.DEPOT_ID]));
                        var oldTotalDistance = baseVehicleDistance + destinationDistance;
                        var newTotalDistance = removedBasedDistance + newDestinationDistance;
                        if (oldTotalDistance > newTotalDistance) {
                            // use new one
                            vehicles[i].newSequence = baseSequenceCopy;
                            vehicles[i].newTotalDistance = removedBasedDistance;
                            vehicles[i].newWeightAvailable = vehicles[i].weightAvailable + sequenceWithWeight[j].weight;
                            vehicles[k].newSequence = relocatedDestinationSequence;
                            vehicles[k].newTotalDistance = newDestinationDistance;
                            vehicles[k].newWeightAvailable = destinationWeightAvailable - sequenceWithWeight[j].weight;
                            // === stop rest of vehicles loop -> goto next destination in base vehicle
                            break restOfVehiclesLoop;
                        }
                    }
                }
            }
        }
    }
    return vehicles;
}
// TODO: Accept param for maxSwapTimes
// Defaults to max
function exchange(vehicles) {
    var maxSwapTimes = Math.floor(vehicles.length * (vehicles.length - 1) / 4);
    var swapTimes = 0;
    baseVehicleLoop: 
    // base vehicle to swap
    for (var i = 0; i < vehicles.length - 1; i++) {
        var sequence = vehicles[i].newSequence || flattenRouteWithoutDepot(vehicles[i].route);
        var sequenceWithWeight = populateWeightToSequence(sequence);
        var baseVehicle = __assign({}, vehicles[i], { sequence: sequence });
        var baseVehicleWeightAvailable = baseVehicle.newWeightAvailable || baseVehicle.weightAvailable;
        var baseVehicleTotalDistance = baseVehicle.newTotalDistance || baseVehicle.totalDistance;
        // skip if length is 1
        if (sequence.length === 1)
            continue;
        // each destination excluding DEPOT
        for (var j = 0; j < sequence.length; j++) {
            // remove ID to put in other vehicle
            var baseSequenceCopy = sequence.slice();
            var relocationBaseID = baseSequenceCopy.splice(j, 1)[0];
            var removedBaseIDWeight = sequenceWithWeight[j].weight;
            var removedBasedWeightAvailable = baseVehicleWeightAvailable + removedBaseIDWeight;
            // the rest of the vehicles
            restOfVehiclesLoop: for (var k = i + 1; k < vehicles.length; k++) {
                var destinationSequence = vehicles[k].newSequence || flattenRouteWithoutDepot(vehicles[k].route);
                var destinationSequenceWithWeight = populateWeightToSequence(destinationSequence);
                var destinationDistance = vehicles[k].newTotalDistance || vehicles[k].totalDistance;
                var destinationWeightAvailable = vehicles[k].newWeightAvailable || vehicles[k].weightAvailable;
                // skip over if length is 1
                if (sequence.length === 1)
                    continue;
                // each destination in other vehicles
                for (var l = 0; l < destinationSequence.length; l++) {
                    // stop when exceeded
                    if (swapTimes > maxSwapTimes) {
                        i = vehicles.length;
                        break baseVehicleLoop;
                    }
                    var exchangeDestinationSequenceCopy = destinationSequence.slice();
                    var exchangeDestinationID = exchangeDestinationSequenceCopy.splice(l, 1)[0];
                    var exchangeDestinationIDWeight = destinationSequenceWithWeight[l].weight;
                    var exchangeDestinationWeightAvailable = destinationWeightAvailable + exchangeDestinationIDWeight;
                    // exchange if can afford
                    if (removedBasedWeightAvailable > exchangeDestinationIDWeight &&
                        exchangeDestinationWeightAvailable > removedBaseIDWeight) {
                        var newBaseSequence = baseSequenceCopy.slice();
                        newBaseSequence.splice(j, 0, exchangeDestinationID);
                        var newBaseTotalDistance = findRouteDistance([config_1.DEPOT_ID].concat(newBaseSequence, [config_1.DEPOT_ID]));
                        var newBaseWeightAvailable = removedBasedWeightAvailable - exchangeDestinationIDWeight;
                        var newDestinationSequence = exchangeDestinationSequenceCopy.slice();
                        newDestinationSequence.splice(l, 0, relocationBaseID);
                        var newDestinationTotalDistance = findRouteDistance([config_1.DEPOT_ID].concat(newDestinationSequence, [config_1.DEPOT_ID]));
                        var newDestinationWeightAvailable = exchangeDestinationWeightAvailable - removedBaseIDWeight;
                        var oldTotalDistance = baseVehicleTotalDistance + destinationDistance;
                        var newTotalDistance = newBaseTotalDistance + newDestinationTotalDistance;
                        // use new sequence if it has lower distance
                        if (newTotalDistance < oldTotalDistance) {
                            vehicles[i].newSequence = newBaseSequence;
                            vehicles[i].newTotalDistance = newBaseTotalDistance;
                            vehicles[i].newWeightAvailable = newBaseWeightAvailable;
                            vehicles[k].newSequence = newDestinationSequence;
                            vehicles[k].newTotalDistance = newDestinationTotalDistance;
                            vehicles[k].newWeightAvailable = newDestinationWeightAvailable;
                            break restOfVehiclesLoop;
                        }
                    }
                }
            }
        }
    }
    return vehicles;
}
//# sourceMappingURL=saving_algorithm.js.map