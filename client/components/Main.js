import React, { Component } from 'react'
// import * as _ from 'lodash'
import * as XLSX from 'xlsx'
// import * as allRoutes from '../test_files/allRoutes'
// import * as swappedWithin  from '../test_files/swappedWithin'
// import * as relocated from '../test_files/relocated'
// import * as exchanged from '../test_files/exchanged'
// import * as swappedWithinSA  from '../test_files/SA_swappedWithin'
// import * as relocatedSA from '../test_files/SA_relocated'
// import * as exchangedSA from '../test_files/SA_exchanged'
// import * as swappedWithinEX  from '../test_files/EX_swappedWithin'
// import * as relocatedEX from '../test_files/EX_relocated'
// import * as exchangedEX from '../test_files/EX_exchanged'

import * as saving from '../../dist/saving_algorithm'
import { calculateSavingsCost } from '../../dist/prepare_files'

const H3 = (props) => {
  return (
    <h3 style={{ textAlign: 'center' }}>{props.children}</h3>
  )
}

export default class Main extends Component {

  constructor(props) {
    super(props)

    this.state = {
      savingsJson: [],
      allRoutes: [],
      loop: 100,
      SA: 20,
      tenure: 3,

      normalSwapped: [],
      normalRelocated: [],
      normalExchanged: [],
      SASwapped: [],
      SARelocated: [],
      SAExchanged: [],
      tabuSwapped: [],
      tabuRelocated: [],
      tabuExchanged: [],
    }
  }

  // Distance file for each points a.k.a. SavingsJSON
  handleAllDistance = (e) => {
    const files = e.target.files
    const file = files[0]
    let wb
    let reader = new FileReader()
    reader.onload =  (e) => {
      let data = e.target.result
      wb = XLSX.read(data, { type: 'binary' })
      const sheet = wb.Sheets['1']
      const jsonSheet= XLSX.utils.sheet_to_json(sheet, { raw: true })
      let savingsJson = calculateSavingsCost(jsonSheet)
      // console.log('Savings JSON:', savingsJson)
      this.setState({ savingsJson })
      saving.setSavingsJSON(savingsJson)
    }
    try {
      reader.readAsBinaryString(file) 
    } catch (error) {
      console.log(error)
    }
  }

  // Schedule of day1 and calculate allRoutes(savings list)
  handleSchedule = (e) => {
    const files = e.target.files
    const file = files[0]
    let wb
    let reader = new FileReader()
    reader.onload =  (e) => {
      let data = e.target.result
      wb = XLSX.read(data, { type: 'binary' })
      const sheet = wb.Sheets['1']
      const jsonSheet= XLSX.utils.sheet_to_json(sheet, { raw: true })
      const { vertices, schedule } = saving.formatSchedule(jsonSheet, { sum: true })
      saving.setSchedule(schedule)
      const savingsTable = saving.calculateSavingsTable(vertices, this.state.savingsJson)
      const allRoutes = saving.calculateAllRoutes(savingsTable, schedule, this.state.savingsJson)
      this.setState({ allRoutes })
    }
    try {
      reader.readAsBinaryString(file)      
    } catch (error) {
      console.log(error)
    }
  }

  handleOptionChange = (e) => {
    this.setState({ [e.target.name]: e.target.value })
  }

  // Display all Route functions (savings list)
  displayAllRoutes = (allRoutes) => {
    const routeData = allRoutes.map(this.displayRoute)
    const totalDistanceDiv = allRoutes.length > 0 ? (
      <p>
        Total Distance: {this.getTotalDistance(allRoutes)}
        <br />
        Total Route: {allRoutes.length}
      </p>
    ) : null
    return (
      <div>
        {routeData}
        {totalDistanceDiv}
      </div>
    )
  }
  displayRoute = ({ route, totalDistance, weightAvailable }, routeIndex) => {
    const divKey = 'displayDivKey' + routeIndex
    return (
      <div key={divKey}>
        {route.map((pair, index) => {
          const spanKey = 'displaySpanKey' + routeIndex + index
          if (index === 0) return (<span key={spanKey}>{pair[0]}>{pair[1]}></span>)
          if (index === route.length - 1) return (<span key={spanKey}>{pair[1]}</span>)
          return (<span key={spanKey}>{pair[1]}></span>)
        })}
        {'\t Total Distance:' + totalDistance}
        {'\t Weight:' + (2000 - Number(weightAvailable))}
      </div>
    )
  }

  // Display whitin tour insertion
  displaySwapped = (swapped) => {
    const routeData = swapped.map(this.displaySwappedWithin)
    const totalDistanceDiv = swapped.length > 0
      ? (
        <p>
          Total Distance: {this.getTotalDistance(swapped)}
          <br />
          Total Route: {swapped.length}
        </p>
      ) : null
    const title = swapped.length > 0 ? <h4>Within Tour Insertion</h4> : null
    return (
      <div>
        {title}
        {routeData}
        {totalDistanceDiv}
      </div>
    )
  }
  displaySwappedWithin = ({ finalRoute, originalRoute, finalDistance }, routeIndex) => {
    const divKey = 'displayDivKey2' + routeIndex
    // if (!_.isEqual(originalRoute, finalRoute)) console.log('Index:', originalRoute, finalRoute)
    return (
      <div key={divKey}>
        <span key={'displaySpanKey'+ routeIndex + '-1'}>261></span>
        {finalRoute.map((pair, index) => {
          const spanKey = 'displaySpanKey' + routeIndex + index
          // if (index === finalRoute.length - 1) return (<span key={spanKey}>{pair}</span>)
          return (<span key={spanKey}>{pair}></span>)
        })}
        <span key={'displaySpanKey' + routeIndex + '+1'}>261</span>
        {'\t Total Distance:' + finalDistance}
        {/* {'\t Weight:' + (2000 - Number(weightAvailable))} */}
      </div>
    )
  }

  displayRelocated = (relocated, name) => {
    const routeData = relocated.map(this.displayRelocatedMap)
    const totalDistanceDiv = relocated.length > 0
      ? (
        <p>
          Total Distance: {this.getTotalDistance(relocated)}
          <br />
          Total Route: {relocated.length}
        </p>
      ) : null
    const title = relocated.length > 0 ? <h4>{name}</h4> : null
    return (
      <div>
        {title}
        {routeData}
        {totalDistanceDiv}
      </div>
    )
  }
  displayRelocatedMap = ({ route, newSequence, totalDistance, newTotalDistance, weightAvailable, newWeightAvailable }, routeIndex) => {
    const divKey = Math.random() + routeIndex
    const distance = '\t Total Distance:' + (newTotalDistance || totalDistance)
    const weight = '\t Weight:' + (2000 - Number(newWeightAvailable || weightAvailable)) 
    let numbers
    if (newSequence) {
      const random = Math.random()
      numbers = newSequence.map((pair, index) => {
        const spanKey = 'displaySpanKey' + (random + index)
        if (index === newSequence.length - 1) return (<span key={spanKey}>{pair}</span>)
        return (<spam key={spanKey}>{pair}></spam>)
      })
    } else {
      numbers = route.map((pair, index) => {
        const spanKey = 'displaySpanKey' + routeIndex + index
        if (index === 0) return (<span key={spanKey}>{pair[0]}>{pair[1]}></span>)
        if (index === route.length - 1) return (<span key={spanKey}>{pair[1]}</span>)
        return (<span key={spanKey}>{pair[1]}></span>)
      })
    }
    return (
      <div key={divKey}>
        {numbers}
        {distance}
        {weight}
      </div>
    )
  }

  getTotalDistance = (allRoutes) => {
    let total = 0
    allRoutes.map(item => {
      // if (item.newSequence && item.newSequence.length < 2) {
      //   return item
      // } else if (item.finalRoute && item.finalRoute.length < 2) {
      //   return item
      // } else if (item.route && item.route.length < 3) {
      //   return item
      // }
      total += item.finalDistance || item.newTotalDistance || item.totalDistance
      return item
    })
    return total
  }

  calculateEverything = () => {
    let options = {
      mode: 0,
      maxSwapTimes: this.state.loop / 100,
      annelingProp: this.state.SA /  100,
      tabuTenure: this.state.tenure,
    }
    const allRoutes = this.state.allRoutes

    const normalSwapped = saving.withinTourInsertion(allRoutes, options, this.state.savingsJson)
    const normalRelocated = saving.relocate(JSON.parse(JSON.stringify(allRoutes)), options)
    const normalExchanged = saving.exchange(JSON.parse(JSON.stringify(allRoutes)), options)

    options.mode = 1

    const SASwapped = saving.withinTourInsertion(allRoutes, options, this.state.savingsJson)
    const SARelocated = saving.relocate(JSON.parse(JSON.stringify(allRoutes)), options)
    const SAExchanged = saving.exchange(JSON.parse(JSON.stringify(allRoutes)), options)

    options.mode = 2

    const tabuSwapped = saving.withinTourInsertion(allRoutes, options, this.state.savingsJson)
    const tabuRelocated = saving.relocate(JSON.parse(JSON.stringify(allRoutes)), options)
    const tabuExchanged = saving.exchange(JSON.parse(JSON.stringify(allRoutes)), options)
    
    this.setState({ normalSwapped, normalRelocated, normalExchanged, SASwapped, SARelocated, SAExchanged, tabuSwapped, tabuRelocated, tabuExchanged })
  }

  render() {

    return (
      <div>
        <h3>Configurations:</h3>
        <label htmlFor="allDistanceInput">All Distance File: </label>
        <input id="allDistanceInput" type="file" onChange={this.handleAllDistance} />
        <br />
        <label htmlFor="scheduleInput">Schedule: </label>
        <input id="scheduleInput" type="file" onChange={this.handleSchedule} />
        <br />
        <label htmlFor="loopInput">Loop %: </label>
        <input id="loopInput" type="number" name="loop" value={this.state.loop} onChange={this.handleOptionChange} />
        <br />
        <label htmlFor="simulatedAnnelingInput">Simulated Anneling %: </label>
        <input id="simulatedAnnelingInput" type="number" name="SA" value={this.state.SA} onChange={this.handleOptionChange} />
        <br />
        <label htmlFor="tenureInput">Tabu Tenure: </label>
        <input id="tenureInput" type="number" name="tenure" value={this.state.tenure} onChange={this.handleOptionChange} />
        <br />
        <button type="button" onClick={this.calculateEverything}>Calculate</button>
        <br/>
        <br/>
        <H3>Savings</H3>
        {this.displayAllRoutes(this.state.allRoutes)}
        <H3>Normal</H3>
        {this.displaySwapped(this.state.normalSwapped)}
        {this.displayRelocated(this.state.normalRelocated, 'Relocate')}
        {this.displayRelocated(this.state.normalExchanged, 'Exchange')}
        <H3>Simulated Anneling</H3>
        {this.displaySwapped(this.state.SASwapped)}
        {this.displayRelocated(this.state.SARelocated, 'Relocate')}
        {this.displayRelocated(this.state.SAExchanged, 'Exchange')}
        <H3>Tabu Search</H3>
        {this.displaySwapped(this.state.tabuSwapped)}
        {this.displayRelocated(this.state.tabuRelocated, 'Relocate')}
        {this.displayRelocated(this.state.tabuExchanged, 'Exchange')}
      </div>
    )
  }
}