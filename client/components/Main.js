import React, { Component } from 'react'
import * as allRoutes from '../test_files/allRoutes'
import * as swappedWithin  from '../test_files/swappedWithin'
import * as _ from 'lodash'

export default class Main extends Component {

  handleChange = (e) => {
    const files = e.target.files
    console.log('Files:', files)
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

  render() {

    console.log('All Routes:', allRoutes)

    return (
      <div>
        <input type="file" onChange={this.handleChange} />
        <br/>
        <br/>
        {allRoutes.map(this.displayRoute)}
        <br/>
        <br/>
        {swappedWithin.map(this.displaySwappedWithin)}
      </div>
    )
  }
}