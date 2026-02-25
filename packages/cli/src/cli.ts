import { Command } from "commander";
import { queryCommand } from "./commands/query.js";
import { batchCommand } from "./commands/batch.js";
import { interactiveCommand } from "./commands/interactive.js";

const program = new Command();

program
  .name("gnomad-cf")
  .description("Query gnomAD carrier frequencies from the terminal")
  .version("1.5.0")
  .addCommand(queryCommand)
  .addCommand(batchCommand)
  .addCommand(interactiveCommand);

// No-args fallback: launch interactive wizard on TTY, print help on non-TTY.
// Must run BEFORE program.parseAsync so commander sees the 'interactive' subcommand.
if (process.argv.length === 2) {
  if (process.stdout.isTTY && process.stdin.isTTY) {
    process.argv.push("interactive");
  } else {
    program.outputHelp();
    process.exit(1);
  }
}

program.parseAsync(process.argv);
