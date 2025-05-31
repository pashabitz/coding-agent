import { StructuredTool, Tool, ToolSchemaBase } from "@langchain/core/tools";
import { StateGraph, END, MessagesAnnotation, Messages, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { UserCode } from "./user_code";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod"; 
import dotenv from "dotenv";
import { messageLog, responseLog } from "./logs";

class ListFilesTool extends Tool {
    private userCode: UserCode;
    constructor(userCode: UserCode) {
        super();
        this.userCode = userCode;
    }
    name = "list_files";
    description = "Lists files in a specified directory. Input should be a directory path (empty string for root).";

    protected async _call(input: string): Promise<string> {
        try {
            const files = this.userCode.listFiles(input);
            return `Files in ${input}: ${files.join(", ")}`;
        } catch (error: any) {
            return `Error listing files: ${error.message}`;
        }
    }
}

class ReadFileTool extends Tool {
    private userCode: UserCode;
    constructor(userCode: UserCode) {
        super();
        this.userCode = userCode;
    }
    name = "read_file";
    description = "Reads the content of a specified file. Input should be a file path relative to the user code directory.";
    protected async _call(input: string): Promise<string> {
        try {
            const content = this.userCode.readFile(input);
            return `Content of ${input}:\n${content}`;
        } catch (error: any) {
            return `Error reading file: ${error.message}`;
        }
    }
}



class WriteFileTool extends StructuredTool {
    private userCode: UserCode;

    constructor(userCode: UserCode) {
        super();
        this.userCode = userCode;
    }
    name = "write_file";
    description = "Writes content to a specified file. Input contains 'filePath' and 'content' parameters.";
    schema = z.object({
        filePath: z.string().describe("The path of the file to write to, relative to the user code directory."),
        content: z.string().describe("The content to write to the file.")
    });
    protected async _call(input: { filePath: string; content: string }): Promise<string> {
        try {
            const { filePath, content } = input;
            this.userCode.modifyFile(filePath, content);
            return `Successfully wrote to ${filePath}`;
        } catch (error: any) {
            return `Error writing file: ${error.message}`;
        }
    }
}

class MakeGithubBranchTool extends Tool {
    private userCode: UserCode;

    constructor(userCode: UserCode) {
        super();
        this.userCode = userCode;
    }

    name = "make_github_branch";
    description = "Creates a new GitHub branch. Input should be the name of the branch.";

    protected async _call(input: string): Promise<string> {
        try {
            this.userCode.executeCommandInRepo(`git checkout -b ${input}`);
            return `Successfully created branch ${input}`;
        } catch (error: any) {
            return `Error creating branch: ${error.message}`;
        }
    }
}

class CommitAndMakePrTool extends StructuredTool {
    private userCode: UserCode;
    constructor(userCode: UserCode) {
        super();
        this.userCode = userCode;
    }
    name = "commit_and_make_pr";
    description = "Commits changes, pushes to remote and creates a PR. Input should be a commit message, the name of the remote branch and the PR title.";
    schema = z.object({
        commitMessage: z.string().describe("The commit message for the changes."),
        remoteBranch: z.string().describe("The name of the remote branch to push to."),
        prTitle: z.string().describe("The title of the pull request.")
    });
    protected async _call(input: { commitMessage: string; remoteBranch: string; prTitle: string }): Promise<string> {
        const assumedMainBranch = "main"; // should be configurable or detected
        try {
            this.userCode.executeCommandInRepo(`git add .`);
            this.userCode.executeCommandInRepo(`git commit -m "${input.commitMessage}"`);
            this.userCode.executeCommandInRepo(`git push origin ${input.remoteBranch}`);
            this.userCode.executeCommandInRepo(`gh pr create --title "${input.prTitle}" --body "${input.prTitle}" --base ${assumedMainBranch} --head ${input.remoteBranch}`);
            this.userCode.executeCommandInRepo(`git checkout ${assumedMainBranch}`);
            return `Successfully committed and pushed changes with message: "${input.commitMessage}" to branch: ${input.remoteBranch} and created PR: ${input.prTitle}`;
        } catch (error: any) {
            return `Error committing and pushing changes: ${error.message}`;
        }
    }
}

export class CodingAgent {
    private userCode: UserCode;
    private tools: (Tool | StructuredTool)[];
    model: any;
    toolNode: ToolNode<any>;
    graph: any;

    constructor(repoName: string) {
        dotenv.config();
        this.userCode = new UserCode(repoName);
        this.tools = [
            new ListFilesTool(this.userCode), 
            new ReadFileTool(this.userCode),
            new WriteFileTool(this.userCode),
            new MakeGithubBranchTool(this.userCode),
            new CommitAndMakePrTool(this.userCode)
        ];
        this.toolNode = new ToolNode(this.tools);
        this.model = new ChatOpenAI({
            model: "gpt-4o-mini",
        }).bindTools(this.tools);
        this.graph = this.setupStateGraph();
    }
    
    private async callModel(state: typeof MessagesAnnotation.State) {
        console.log(messageLog(state.messages[state.messages.length - 1]));
        const response = await this.model.invoke(state.messages);
        console.log(responseLog(response));
        console.log("\n\n");
        return { messages: [response] };
    }
    private shouldContinue({ messages }: typeof MessagesAnnotation.State) {
        const lastMessage = messages[messages.length - 1] as AIMessage;

        // If the LLM makes a tool call, then we route to the "tools" node
        if (lastMessage.tool_calls?.length) {
            return "tools";
        }
        // Otherwise, we stop (reply to the user) - go to the END node
        return END;
    }
    private setupStateGraph() {
        const graph = new StateGraph(MessagesAnnotation)
            .addNode("agent", this.callModel.bind(this))
            .addEdge(START, "agent")
            .addNode("tools", this.toolNode)
            .addEdge("tools", "agent")
            .addConditionalEdges("agent", this.shouldContinue.bind(this));
        return graph.compile();
    }
    async runAgent(input: string): Promise<Messages> {
        const response = await this.graph.invoke({
            messages: [new HumanMessage(input)],
        });
        return response;
    }
}