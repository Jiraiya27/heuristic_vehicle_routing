import React, { Component } from 'react'
import * as allRoutes from '../test_files/allRoutes'

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

  render() {

    console.log('All Routes:', allRoutes)

    return (
      <div>
        <input type="file" onChange={this.handleChange} />
        <br/>
        <br/>
        {allRoutes.map(this.displayRoute)}
      </div>
    )
  }
}