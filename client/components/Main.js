import React, { Component } from 'react'
import * as _ from 'lodash'
import * as XLSX from 'xlsx'
import * as allRoutes from '../test_files/allRoutes'
import * as swappedWithin  from '../test_files/swappedWithin'
import * as relocated from '../test_files/relocated'
import * as exchanged from '../test_files/exchanged'
import * as swappedWithinSA  from '../test_files/SA_swappedWithin'
import * as relocatedSA from '../test_files/SA_relocated'
import * as exchangedSA from '../test_files/SA_exchanged'
import * as swappedWithinEX  from '../test_files/EX_swappedWithin'
import * as relocatedEX from '../test_files/EX_relocated'
import * as exchangedEX from '../test_files/EX_exchanged'
import * as saving from '../../dist/saving_algorithm'

export default class Main extends Component {

  handleChange = (e) => {
    const files = e.target.files
    const file = files[0]
    let wb
    let reader = new FileReader()
    reader.onload =  function(e) {
      let data = e.target.result
      wb = XLSX.read(data, { type: 'binary' })
      console.log(wb)
      saving.se
    }
    reader.readAsBinaryString(file)
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

  displaySwappedWithin = ({ finalRoute, originalRoute, finalDistance }, routeIndex) => {
    const divKey = 'displayDivKey2' + routeIndex
    if (!_.isEqual(originalRoute, finalRoute)) console.log('Index:', originalRoute, finalRoute)
    return (
      <div key={divKey}>
        {finalRoute.map((pair, index) => {
          const spanKey = 'displaySpanKey' + routeIndex + index
          if (index === finalRoute.length - 1) return (<span key={spanKey}>{pair}</span>)
          return (<span key={spanKey}>{pair}></span>)
        })}
        {'\t Total Distance:' + finalDistance}
        {/* {'\t Weight:' + (2000 - Number(weightAvailable))} */}
      </div>
    )
  }

  displayRelocated = ({ route, newSequence, totalDistance, newTotalDistance, weightAvailable, newWeightAvailable }, routeIndex) => {
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

  render() {

    console.log(saving)
    console.log('All Routes:', allRoutes)
    const totalAllRoutes = this.getTotalDistance(allRoutes)
    const totalWTI = this.getTotalDistance(swappedWithin)
    const totalRelocate = this.getTotalDistance(relocated)
    const totalExchange = this.getTotalDistance(exchanged)

    return (
      <div>
        <input type="file" onChange={this.handleChange} />
        <br/>
        <br/>
        {allRoutes.map(this.displayRoute)}
        {totalAllRoutes}
        <br/>
        <br/>
        {swappedWithin.map(this.displaySwappedWithin)}
        {totalWTI}
        <br/>
        <br/>
        {relocated.map(this.displayRelocated)}
        {totalRelocate}
        <br/>
        <br/>
        {exchanged.map(this.displayRelocated)}
        {totalExchange}
      </div>
    )
  }
}