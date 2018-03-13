"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var XLSX = require("xlsx");
var path = require("path");
// const COST_MATRIX_PATH = path.join(__dirname, '../files/ODCostMetrix.xlsx')
var COST_MATRIX_PATH = path.resolve('files/ODCostMetrix.xlsx');
var workbook = XLSX.readFile(COST_MATRIX_PATH);
var sheet = workbook.Sheets['1'];
var jsonSheet = XLSX.utils.sheet_to_json(sheet);
/**
 * Calculates savings cost according to formula
 * ค่าการประหยัด (S ij ) = d(Depot, i)+d(Depot, j)–d(i, j)
 * Assumes data to be sorted in order
 * @param sheet
 */
function calculateSavingsCost(sheet) {
}
// console.log(sheet['B13'])
console.log(XLSX.utils.sheet_to_json(sheet));
//# sourceMappingURL=prepare_files.js.map