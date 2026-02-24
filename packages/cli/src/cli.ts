import { Command } from 'commander'

const program = new Command()

program
  .name('gnomad-cf')
  .description('Query gnomAD carrier frequencies from the terminal')
  .version('1.5.0')

// Subcommands will be added in subsequent plans:
// - query: single gene lookup
// - batch: multi-gene processing
// - interactive: wizard mode

program.parseAsync(process.argv)
