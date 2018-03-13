"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var XLSX = require("xlsx");
// import { orderBy } from 'lodash'
var config_1 = require("./config");
function createSavingsFile() {
    var workbook = XLSX.readFile(config_1.COST_MATRIX_PATH);
    var sheet = workbook.Sheets['1'];
    var jsonSheet = XLSX.utils.sheet_to_json(sheet, { raw: true });
    var savingsJson = calculateSavingsCost(jsonSheet);
    var savingsSheet = XLSX.utils.json_to_sheet(savingsJson);
    // console.log('Savings Sheet:', savingsSheet)
    var savingsWB = {
        SheetNames: ['1'],
        Sheets: { '1': savingsSheet }
    };
    XLSX.writeFile(savingsWB, 'new_files/savings_cost.xlsx');
    // const sortedSavingsJson = sortSavingsFile(savingsJson)
    // const sortedSavingsSheet = XLSX.utils.json_to_sheet(sortedSavingsJson)
    // const sortedSavingsWB: XLSX.WorkBook = {
    //   SheetNames: ['1'],
    //   Sheets: { '1': sortedSavingsSheet }
    // }
    // XLSX.writeFile(sortedSavingsWB, 'new_files/savings_cost_sorted.xlsx')
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
function calculateSavingsCost(sheet) {
    // const newSheet = []
    for (var i = 0; i <= config_1.TOTAL_NODES; i++) {
        if (i + 1 === config_1.DEPOT_ID)
            continue; // skip savings cost for depot
        for (var j = i + 1; j <= config_1.TOTAL_NODES - 1; j++) {
            var diIndex = (config_1.TOTAL_NODES * i) + config_1.DEPOT_ID - 1; // d(Depot, i) => d(i, Depot)
            var djIndex = (config_1.TOTAL_NODES * j) + config_1.DEPOT_ID - 1; // d(Depot, j) => d(j, Depot)
            var rowIndex = i * config_1.TOTAL_NODES + j;
            var diValue = sheet[diIndex].Total_Length;
            var djValue = sheet[djIndex].Total_Length;
            var dij = sheet[rowIndex].Total_Length;
            var savingsCost = diValue + djValue - dij;
            sheet[rowIndex].Savings_Cost = savingsCost;
            sheet[rowIndex].Depot_To_Origin = diValue;
            sheet[rowIndex].Depot_To_Destination = djValue;
            // newSheet.push(sheet[rowIndex])
        }
    }
    // return newSheet
    return sheet;
}
// function sortSavingsFile (sheet: COST_MATRIX_DATA[]) : COST_MATRIX_DATA[] {
//   return orderBy(sheet, ['Savings_Cost'], ['desc'])
// }
// console.log(sheet['B13'])
// console.log(XLSX.utils.sheet_to_json(sheet).length)
// console.log(workbook.SheetNames)
// calculateSavingsCost(jsonSheet)
// createSavingsFile()
module.exports = {
    calculateSavingsCost: calculateSavingsCost,
    createSavingsFile: createSavingsFile,
};
//# sourceMappingURL=prepare_files.js.map