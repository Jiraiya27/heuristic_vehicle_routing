"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var winston_1 = require("winston");
exports.logger = new (winston_1.Logger)({
    level: 'error',
    transports: [
        new (winston_1.transports.Console)({
            colorize: true,
        }),
    ],
});
//# sourceMappingURL=logger.js.map