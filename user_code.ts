import * as fs from 'fs';
import * as path from 'path';
const { execSync } = require('child_process');

export class UserCode {
    repoName: string;
    repoDirectory: any;
    constructor(repoName: string) {
        this.repoName = repoName;
        this.repoDirectory = path.join(__dirname, 'user_code', repoName);
        if (!fs.existsSync(this.repoDirectory)) {
            throw new Error(`User code directory does not exist: ${this.repoDirectory}`);
        }
    }
    public listFiles(dir: string): string[] {
        const fullPath = path.join(this.repoDirectory, dir);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Directory does not exist: ${fullPath}`);
        }
        return fs.readdirSync(fullPath, { withFileTypes: true }).map(dirent => dirent.name);
    }
    public readFile(filePath: string): string {
        const fullPath = path.join(this.repoDirectory, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File does not exist: ${fullPath}`);
        }
        return fs.readFileSync(fullPath, 'utf-8');
    }
    public modifyFile(filePath: string, content: string): void {
        const fullPath = path.join(this.repoDirectory, filePath);
        fs.writeFileSync(fullPath, content, 'utf-8');
    }

    public executeCommandInRepo(command: string): string {
        const fullPath = this.repoDirectory;
        try {
            return execSync(command, { cwd: fullPath, encoding: 'utf-8' });
        } catch (error) {
            throw new Error(`Command execution failed: ${error.message}`);
        }
    }
}