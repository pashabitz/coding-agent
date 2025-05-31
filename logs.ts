import { AIMessage, BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

export function responseLog(response: AIMessage): string {
    if (response.tool_calls && response.tool_calls.length > 0) {
        return `Tool calls made by the model: ${JSON.stringify(response.tool_calls)}`;
    }
    if (response.content) {
        return response.content.toString();
    } else {
        return "Model response does not contain content.";
    }
}
export function messageLog(message: BaseMessage): string {
    if (message instanceof HumanMessage) {
        return `User message: ${message.content}`;
    }
    if (message instanceof ToolMessage) {
        return `Tool ${message.name} message: ${message.content}`;
    }
    return `Unknown message type: ${message.content.toString()}`;
}