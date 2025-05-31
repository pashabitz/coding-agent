import { program } from 'commander';
import { exec } from 'child_process';
import * as path from 'path';
import { CodingAgent } from './agent';
program.command("solve <repoName> <task>")
    .description("Solve a coding task in a specified repository")
    .action(async (repoName: string, task: string) => {
        const agent = new CodingAgent(repoName);
        const response = await agent.runAgent(task);
    });

program.parse();