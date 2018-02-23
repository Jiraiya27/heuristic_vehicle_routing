import { Logger, transports } from 'winston'

export const logger = new (Logger)({
  level: 'error',
  transports: [
    new (transports.Console)({
      colorize: true
    })
  ]
})