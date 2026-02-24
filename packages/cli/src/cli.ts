import { Command } from 'commander'
import { queryCommand } from './commands/query.js'
import { batchCommand } from './commands/batch.js'

const program = new Command()

program
  .name('gnomad-cf')
  .description('Query gnomAD carrier frequencies from the terminal')
  .version('1.5.0')
  .addCommand(queryCommand)
  .addCommand(batchCommand)

// Interactive command will be added in a subsequent plan

program.parseAsync(process.argv)
