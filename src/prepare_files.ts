import * as XLSX from 'xlsx'
import { orderBy } from 'lodash'
import { TOTAL_NODES, DEPOT_ID, COST_MATRIX_PATH, SAVINGS_COST_PATH } from './config'

interface COST_MATRIX_DATA {
  OriginID: number,
  DestinationID: number,
  Total_Length: number,
  Savings_Cost?: number,
  Depot_To_Origin? : number,
  Depot_To_Destination? : number,
}

function createSavingsFile () {
  const workbook = XLSX.readFile(COST_MATRIX_PATH)
  const sheet = workbook.Sheets['1']
  const jsonSheet: COST_MATRIX_DATA[] = XLSX.utils.sheet_to_json(sheet, { raw: true })
  const savingsJson = calculateSavingsCost(jsonSheet)
  const savingsSheet = XLSX.utils.json_to_sheet(savingsJson)
  // console.log('Savings Sheet:', savingsSheet)
  const savingsWB: XLSX.WorkBook = {
    SheetNames: ['1'],
    Sheets: { '1': savingsSheet }
  }
  XLSX.writeFile(savingsWB, 'new_files/savings_cost.xlsx')

  const sortedSavingsJson = sortSavingsFile(savingsJson)
  const sortedSavingsSheet = XLSX.utils.json_to_sheet(sortedSavingsJson)
  const sortedSavingsWB: XLSX.WorkBook = {
    SheetNames: ['1'],
    Sheets: { '1': sortedSavingsSheet }
  }
  XLSX.writeFile(sortedSavingsWB, 'new_files/savings_cost_sorted.xlsx')
}

/** Calculates savings cost according to formula:  
 * 
 *  ค่าการประหยัด (S ij) = d(Depot, i)+d(Depot, j)–d(i, j)  
 * 
 * Since d(i,j) != d(j,i) all value will be taken
 * from cases where i < j when j > i  
 * Example:
 *  * actual: d(i,j) = 1, d(j,i) = 2
 *  * computed: d(i,j) = d(j,i) = 1
 * 
 * @param {COST_MATRIX_DATA[]} sheet
 * @returns {COST_MATRIX_DATA[]}
 */
function calculateSavingsCost(sheet: COST_MATRIX_DATA[]) : COST_MATRIX_DATA[] {
  // const newSheet = []
  for (let i = 0; i <= TOTAL_NODES; i++) {
    if (i + 1 === DEPOT_ID) continue // skip savings cost for depot
    for (let j = i + 1; j <= TOTAL_NODES - 1; j++) { // skip same number
      const diIndex = (TOTAL_NODES * i) + DEPOT_ID - 1 // d(Depot, i) => d(i, Depot)
      const djIndex = (TOTAL_NODES * j) + DEPOT_ID - 1 // d(Depot, j) => d(j, Depot)
      const rowIndex = i * TOTAL_NODES + j
      const diValue = sheet[diIndex].Total_Length
      const djValue = sheet[djIndex].Total_Length
      const dij = sheet[rowIndex].Total_Length
      const savingsCost = diValue + djValue - dij
      sheet[rowIndex].Savings_Cost = savingsCost
      sheet[rowIndex].Depot_To_Origin = diValue
      sheet[rowIndex].Depot_To_Destination = djValue
      // newSheet.push(sheet[rowIndex])
    }
  }

  // return newSheet
  return sheet
}

function sortSavingsFile (sheet: COST_MATRIX_DATA[]) : COST_MATRIX_DATA[] {
  return orderBy(sheet, ['Savings_Cost'], ['desc'])
}

// console.log(sheet['B13'])
// console.log(XLSX.utils.sheet_to_json(sheet).length)
// console.log(workbook.SheetNames)
// calculateSavingsCost(jsonSheet)
createSavingsFile()