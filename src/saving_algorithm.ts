import * as XLSX from 'xlsx'
import { orderBy } from 'lodash'
import {
  SAVINGS_OUTPUT_PATH, 
  SCHEDULE_ORDER_PATH, 
  MAX_VEHICLE_WEIGHT, 
  SAVINGS_COST_PATH, 
  DEPOT_ID,
  TOTAL_NODES,
} from './config'

interface COST_MATRIX_DATA {
  OriginID: number,
  DestinationID: number,
  Total_Length: number,
  Savings_Cost: number,
  Depot_To_Origin : number,
  Depot_To_Destination : number,
}

interface Format_Options {
  sum: boolean,
}

interface Schedule_Data {
  No: number,
  KG: number,
}

interface Schedule_Object {
  [No: number]: {
    totalKG: number,
    remainingKG: number,
  }
}

interface Route {
  route: Array<[number, number]>,
  totalDistance: number,
  front: number,
  back: number,
  weightAvailable: number,
}

const savingsWB = XLSX.readFile(SAVINGS_OUTPUT_PATH)
const savingsJSON: COST_MATRIX_DATA[] = XLSX.utils.sheet_to_json(savingsWB.Sheets['1'], { raw: true })

const scheduleWB = XLSX.readFile(SCHEDULE_ORDER_PATH)
const day1JSON: Schedule_Data[] = XLSX.utils.sheet_to_json(scheduleWB.Sheets['1'], { raw: true })
const { vertices, schedule } = formatSchedule(day1JSON, { sum: true })
const savingsTable = calculateSavingsTable(vertices, savingsJSON)
// === TEST ===
const savingsTableSheet = XLSX.utils.json_to_sheet(savingsTable)
const savingsTableWB: XLSX.WorkBook = {
  SheetNames: ['1'],
  Sheets: { '1': savingsTableSheet}
}
XLSX.writeFile(savingsTableWB, 'new_files/savings_table_1.xlsx')
// === TEST ===
const allRoutes = calculateAllRoutes(savingsTable, schedule, savingsJSON)
console.log('All Routes:', allRoutes)

const swappedWithin = withinTourInsertion(allRoutes, savingsJSON)
console.log('Swapped Within:', swappedWithin)

const noOfVehicles = allRoutes.length


function formatSchedule(schedule: Schedule_Data[], { sum }: Format_Options = { sum: false }) {
  const scheduleObject: Schedule_Object = {}
  if (sum) {
    const vertices = schedule.map(({ No, KG }) => {
      if (KG === 0) return undefined

      if (scheduleObject[No]) {
        scheduleObject[No] = { totalKG: scheduleObject[No].totalKG + KG, remainingKG: scheduleObject[No].totalKG + KG }
      } else {
        scheduleObject[No] = { totalKG: KG, remainingKG: KG }
      }
      return No
      // remove duplicate after sum
    }).filter((no, index, array) => { return array.indexOf(no) === index && no !== undefined }) as number[]

    return { vertices, schedule: scheduleObject }
  } else {
    const vertices = schedule.map(({ No, KG }) => {
      scheduleObject[No] = { totalKG: KG, remainingKG: KG }
      return No
    })
    return { vertices, schedule: scheduleObject }
  }
}

function calculateSavingsTable(vertices: number[], savingsJSON: COST_MATRIX_DATA[]) {
  // sort ascending order
  vertices = vertices.sort((a, b) => { return a - b })

  const savingsTable : COST_MATRIX_DATA[] = []
  for (let i = 0; i <= vertices.length; i++) {
    for (let j = i + 1; j <= vertices.length - 1; j++ ) {
      const rowIndex = (vertices[i] - 1) * TOTAL_NODES + vertices[j] - 1
      savingsTable.push({ ...savingsJSON[rowIndex] })
    }
  }

  return orderBy(savingsTable, ['Savings_Cost'], ['desc'])
}

function calculateAllRoutes(table: COST_MATRIX_DATA[], schedule: Schedule_Object, fullSavingsTable: COST_MATRIX_DATA[]) {
  let allRoutes: Route[] = []
  let incompleteRoutes: Route[] = []

  // loop to eliminate all routes with weight > max
  Object.keys(schedule).map((key) => {
    const destinationRequirement = schedule[Number(key)]
    while (destinationRequirement.remainingKG > MAX_VEHICLE_WEIGHT) {
      // console.log('Key:', key, 'Remaining:', destinationRequirement.remainingKG)
      // console.log((Number(key) - 1) * TOTAL_NODES + DEPOT_ID - 1)
      const depotDistance = fullSavingsTable[(Number(key) - 1) * TOTAL_NODES + DEPOT_ID - 1].Total_Length
      const oneDestinationRoute: Route = {
        front: Number(key),
        back: Number(key),
        route: [[DEPOT_ID, Number(key)],[Number(key), DEPOT_ID]],
        totalDistance: depotDistance * 2,
        weightAvailable: 0,
      }
      allRoutes.push(oneDestinationRoute)
      destinationRequirement.remainingKG -= MAX_VEHICLE_WEIGHT
    }
  })

  // check incomplete routes when possible
  // consider only cases that weigth a + b < max, otherwise skip
  // make routes open-ended
  table.map((row) => {
    const origin = schedule[row.OriginID]
    const destination = schedule[row.DestinationID]
    let rowCompleted = false

    // check in incomplete routes
    incompleteRoutes.map((route) => {
      // console.log('Route:', route)
      if (route.front == row.OriginID && route.back !== row.DestinationID) {
        // console.log('Route.front:', route.front, 'row.OriginID:', row.OriginID)
        if (route.weightAvailable > destination.remainingKG && destination.remainingKG !== 0) {
          route.front = row.DestinationID
          route.route.unshift([row.DestinationID, row.OriginID])
          route.totalDistance += row.Total_Length
          route.weightAvailable -= destination.remainingKG

          rowCompleted = true
          if (origin.remainingKG !== 0) {
            console.log('Origin remaining !== 0', origin.remainingKG)
          }
          destination.remainingKG = 0
        }
      } 
      else if (route.front == row.DestinationID && route.back !== row.OriginID) {
        if (route.weightAvailable > origin.remainingKG && origin.remainingKG !== 0) {
          route.front = row.OriginID
          route.route.unshift([row.OriginID, row.DestinationID])
          route.totalDistance += row.Total_Length
          route.weightAvailable -= origin.remainingKG

          rowCompleted = true
          if (destination.remainingKG !== 0) {
            console.log('destination remaining !== 0', destination.remainingKG)
          }
          origin.remainingKG = 0
        }
      }
      else if (route.back == row.OriginID && route.front !== row.DestinationID) {
        if (route.weightAvailable > destination.remainingKG && destination.remainingKG !== 0) {
          route.back = row.DestinationID
          route.route.push([row.OriginID, row.DestinationID])
          route.totalDistance += row.Total_Length
          route.weightAvailable -= destination.remainingKG

          rowCompleted = true
          if (origin.remainingKG !== 0) {
            console.log('Origin remaining !== 0', origin.remainingKG)
          }
          destination.remainingKG = 0
        }
      }
      else if (route.back == row.DestinationID && route.front !== row.OriginID) {
        if (route.weightAvailable > origin.remainingKG && origin.remainingKG !== 0) {
          route.back = row.OriginID
          route.route.push([row.DestinationID, row.OriginID])
          route.totalDistance += row.Total_Length
          route.weightAvailable -= origin.remainingKG
        
          rowCompleted = true
          if (destination.remainingKG !== 0) {
            console.log('destination remaining !== 0', destination.remainingKG)
          }
          origin.remainingKG = 0
        }
      }
      return route
    })

    // appended to an incomplete route
    if (rowCompleted) return row
    // can't send if exceed
    if (origin.remainingKG + destination.remainingKG > MAX_VEHICLE_WEIGHT) return row
    // already sent to 1 of them
    if (origin.remainingKG === 0 || destination.remainingKG === 0) return row
  
    // Create new route and add to incomplete routes
    const newRoute: Route = {
      front: row.OriginID,
      back: row.DestinationID,
      route: [[row.OriginID, row.DestinationID]],
      totalDistance: row.Total_Length,
      weightAvailable: MAX_VEHICLE_WEIGHT - origin.remainingKG - destination.remainingKG
    }
    origin.remainingKG = 0
    destination.remainingKG = 0
    incompleteRoutes.push(newRoute)
    // console.log('Incomplete routes:', incompleteRoutes)
    return row
  })

  // console.log('Incomplete Routes:', incompleteRoutes)

  // calculate distances and finish off all incomplete routes
  // add all incomplete(now completed routes to all routes)
  incompleteRoutes.map((route) => {
    route.route.unshift([DEPOT_ID, route.front])
    route.route.push([route.back, DEPOT_ID])
    const frontDepotDistance = fullSavingsTable[(route.front - 1) * TOTAL_NODES + DEPOT_ID - 1].Total_Length
    const backDepotDistance = fullSavingsTable[(route.back - 1) * TOTAL_NODES + DEPOT_ID - 1].Total_Length
    route.totalDistance += frontDepotDistance + backDepotDistance
    return route
  })
  allRoutes = allRoutes.concat(incompleteRoutes)

  // finish off the rest of the routes (similar to 1)
  Object.keys(schedule).map((key) => {
    const destinationRequirement = schedule[Number(key)]
    if (destinationRequirement.remainingKG !== 0) {
      const depotDistance = fullSavingsTable[(Number(key) - 1) * TOTAL_NODES + DEPOT_ID - 1].Total_Length
      const oneDestinationRoute: Route = {
        front: Number(key),
        back: Number(key),
        route: [[DEPOT_ID, Number(key)],[Number(key), DEPOT_ID]],
        totalDistance: depotDistance * 2,
        weightAvailable: MAX_VEHICLE_WEIGHT - destinationRequirement.remainingKG,
      }
      allRoutes.push(oneDestinationRoute)
      destinationRequirement.remainingKG = 0
    }
  })

  return allRoutes
}

function withinTourInsertion(vehicles: Route[], fullSavingsTable: COST_MATRIX_DATA[]) {
  return vehicles.map(vehicle => {
    const totalLength = vehicle.route.length
    const totalDistance = vehicle.totalDistance
    // no swap for single destination routes
    if (totalLength === 2) return vehicle

    // make a single array excluding depot_id
    const sequence = vehicle.route.map(([num1, num2]) => {
      if (num2 === DEPOT_ID) return null
      return num2
    }).filter(num => num) as number[]
    // console.log('Sequence:', sequence)
    // console.log('Total Distance:', totalDistance)

    // swap for half of total possibilities
    // redo if found better solution
    // TODO: rename current distance to original distance and distance -> currentDistance
    let currentCount = 0
    let currentDistance = totalDistance
    let distance = totalDistance
    let routes
    const maxSwapTimes = Math.floor(sequence.length * (sequence.length - 1) / 4)
    while(currentCount < maxSwapTimes) {
      ({ routes, currentCount, distance } = swapRouteWithin(sequence, currentCount, distance))
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
    }
  })
}

function swapRouteWithin(routes: number[], currentCount: number, currentDistance: number) {
  const maxSwapTimes = Math.floor(routes.length * (routes.length - 1) / 4)
  for (let i = 0; i <= routes.length - 1; i++) {
    for(let j = 1; j < routes.length; j++) {
      // exceed maxSwap, return
      if (currentCount > maxSwapTimes) {
        i = routes.length
        break
      }

      // swap and add back depot into routes
      // compare new route's distance
      // break if lower than currentDistance
      let swappedRoute = swap(routes, routes[i], routes[j])
      swappedRoute.unshift(DEPOT_ID)
      swappedRoute.push(DEPOT_ID)
      const distance = findRouteDistance(swappedRoute)
      // console.log('Distance:', distance)
      if (distance < currentDistance) {
        return {
          routes: swappedRoute,
          currentCount: ++currentCount,
          distance: distance
        }
      }
      
      currentCount++
    }
  }
  return {
    routes,
    currentCount,
    distance: currentDistance
  }
}

function swap(route: number[], valueA: number, valueB: number) {
  return route.map((value) => {
    if (value === valueA) return valueB
    if (value === valueB) return valueA
    return value
  })
}

function findRouteDistance(route: number[]) {
  let distance = 0
  // console.log('Route:', route)
  for (let i = 0; i < route.length - 1; i++) {
    distance += findDistance(route[i], route[i+1])
  }
  return distance
}

// TODO: Refactor other find distances with this function
function findDistance(point1: number, point2: number) {
  if (point2 < point1) {
    const temp =  point1
    point1 = point2
    point2 =  temp
  }
  const index = (point1 - 1) * TOTAL_NODES + point2 - 1
  // if (!savingsJSON[index].Total_Length) {
  //   console.log('Savings JSON at index:', savingsJSON[index])
  //   console.log(index)
  //   console.log(point1)
  //   console.log(point2)
  // }
  if (!savingsJSON[index]) {
    console.log("Can't find index:", index)
  }
  // TEMP FIX: value of 0 equals undefined in JSON
  // ID 85 and 86 are same location which gives 0 casuing the bug
  // look into a way for actually having 0 as value
  return savingsJSON[index].Total_Length || 0
}